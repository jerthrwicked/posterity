// Tests .claude/hooks/guard-branch-delete.mjs, the hook that asks Jeremy before
// any command that deletes a branch on GitHub. Runs offline and touches nothing.
//
//   node scripts/test-branch-delete-guard.mjs

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { reasonToAsk } from '../.claude/hooks/guard-branch-delete.mjs';

const hookPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.claude', 'hooks', 'guard-branch-delete.mjs');

// Commands that delete a remote branch or ref, so the hook must ask.
const mustAsk = [
  'git push origin :walker/build',
  'git push origin :refs/heads/walker/build',
  'git push origin +:walker/build',
  'git push origin -d walker/build',
  'git push -d origin walker/build',
  'git push origin walker/build --delete',
  'git push origin --delete walker/build',
  'git push --delete origin walker/build',
  'git push origin -ud walker/build',
  'git push --prune origin',
  'git push --mirror origin',
  'git push origin :refs/tags/v1',
  'git -C C:/Users/jerth/posterity push origin :walker/build',
  'git -c push.default=simple push origin :walker/build',
  'cd C:/Users/jerth/posterity && git push origin :walker/build',
  'git fetch origin; git push origin -d old-branch',
  'git status | git push origin :x',
  'GIT_TRACE=1 git push origin :walker/build',
  'env GIT_TRACE=1 git push origin :walker/build',
  '"C:/Program Files/Git/bin/git.exe" push origin :walker/build',
  'git push origin ":walker/build"',
  "git push origin ':walker/build'",
  'bash -c "git push origin :walker/build"',
  'powershell -Command "git push origin -d walker/build"',
  'gh api -X DELETE repos/jerthrwicked/posterity/git/refs/heads/walker/build',
  'gh api repos/jerthrwicked/posterity/git/refs/heads/walker/build -X DELETE',
  'gh api --method DELETE repos/jerthrwicked/posterity/git/refs/heads/x',
  'gh api --method=DELETE repos/jerthrwicked/posterity/git/refs/heads/x',
  'gh api -XDELETE repos/jerthrwicked/posterity/git/refs/heads/x',
  'gh api -X delete repos/jerthrwicked/posterity/git/refs/heads/x',
  'git push origin -d a b c d e f g h i j k l m n o p q',
];

// Ordinary commands the hook must leave alone.
const mustPass = [
  'git push',
  'git push origin',
  'git push origin main',
  'git push -u origin settings/branch-delete-guard',
  'git push --set-upstream origin docs/new-branch',
  'git push origin HEAD',
  'git push origin HEAD:refs/heads/docs/x',
  'git push origin local:remote',
  'git push origin :',
  'git push origin --tags',
  'git push --dry-run origin main',
  'git push -v origin main',
  'git push -o ci.skip origin main',
  'git branch -d settings/close-gaps',
  'git branch -D old-local-branch',
  'git commit -m "Delete the old page"',
  'git log --oneline -5',
  'git diff main -- .claude/settings.json',
  'git pull --rebase origin main',
  'gh pr create --base main --head settings/branch-delete-guard',
  'gh pr merge 32 --merge',
  'gh api repos/jerthrwicked/posterity/branches',
  'gh api -X GET repos/jerthrwicked/posterity/git/refs/heads/main',
  'npm run build',
  'echo done',
  'ls -la',
  '',
];

let passed = 0;
let failed = 0;
const check = (ok, label) => {
  if (ok) passed++;
  else { failed++; console.log(`FAIL  ${label}`); }
};

for (const command of mustAsk) check(reasonToAsk(command) !== null, `should ask: ${command}`);
for (const command of mustPass) check(reasonToAsk(command) === null, `should pass: ${command}`);

// The hook end to end, the way Claude Code calls it: JSON on standard input.
function runHook(call) {
  const result = spawnSync(process.execPath, [hookPath], { input: JSON.stringify(call), encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout.trim() };
}

for (const toolName of ['Bash', 'PowerShell']) {
  const asked = runHook({ hook_event_name: 'PreToolUse', tool_name: toolName, tool_input: { command: 'git push origin :walker/build' } });
  let decision = null;
  try { decision = JSON.parse(asked.stdout).hookSpecificOutput; } catch {}
  check(asked.status === 0, `${toolName}: exits 0 when it asks`);
  check(decision?.hookEventName === 'PreToolUse' && decision?.permissionDecision === 'ask', `${toolName}: returns permissionDecision ask`);
  check(typeof decision?.permissionDecisionReason === 'string' && decision.permissionDecisionReason.includes('Jeremy'), `${toolName}: gives its reason`);

  const silent = runHook({ hook_event_name: 'PreToolUse', tool_name: toolName, tool_input: { command: 'git push -u origin docs/x' } });
  check(silent.status === 0 && silent.stdout === '', `${toolName}: silent on an ordinary push`);
}

const broken = spawnSync(process.execPath, [hookPath], { input: 'not json', encoding: 'utf8' });
check(broken.status === 0 && broken.stdout.trim() === '', 'unreadable input lets the command through to the normal rules');

// The committed settings call the hook, and docedit's rules are gone.
const settingsPath = path.join(path.dirname(hookPath), '..', 'settings.json');
let settings = null;
try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')); } catch {}
check(settings !== null, '.claude/settings.json parses as JSON');
const entry = settings?.hooks?.PreToolUse?.[0];
check(entry?.matcher === 'Bash|PowerShell', 'settings run the hook on Bash and PowerShell commands');
check(entry?.hooks?.[0]?.command === 'node' && /\/\.claude\/hooks\/guard-branch-delete\.mjs$/.test(entry?.hooks?.[0]?.args?.[0] || ''), 'settings point at the hook file');
check(!JSON.stringify(settings?.permissions || {}).includes('docedit'), 'settings carry no docedit rules');

console.log(`${passed} checks passing${failed ? `, ${failed} failing` : ''}`);
process.exit(failed ? 1 : 0);
