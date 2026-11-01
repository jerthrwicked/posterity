// Asks Jeremy before any command that deletes a branch on GitHub.
//
// The ask rules in .claude/settings.json catch only `git push origin --delete`
// and `git push --delete`. Git deletes a remote branch through several other
// forms, and every one of them matches the rule that lets pushes run without
// asking. This PreToolUse hook catches those forms and returns "ask", which
// shows the normal permission prompt in every mode, Auto mode included.
//
// Caught: a refspec with an empty source (`git push origin :branch`), -d or
// --delete anywhere after `push`, --prune and --mirror (both delete remote
// branches), and a DELETE sent through `gh api`. A command passed to another
// shell as a quoted string is checked the same way.
//
// Any failure lets the command through to the normal rules, so a broken hook
// never blocks work. scripts/test-branch-delete-guard.mjs tests it.

const SEPARATORS = new Set([';', '&', '|', '\n', '(', ')']);
const WRAPPERS = new Set(['env', 'command', 'exec', 'time', 'nice', 'nohup']);
const GIT_OPTIONS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']);

// Splits a command into segments of tokens, honoring quotes.
function segments(command) {
  const result = [];
  let tokens = [];
  let token = '';
  let hasToken = false;
  let quote = null;
  const endToken = () => {
    if (hasToken) tokens.push(token);
    token = '';
    hasToken = false;
  };
  const endSegment = () => {
    endToken();
    if (tokens.length) result.push(tokens);
    tokens = [];
  };
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < command.length) token += command[++i];
      else token += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; hasToken = true; continue; }
    if (ch === '\\' && i + 1 < command.length && command[i + 1] !== '\n') { token += command[++i]; hasToken = true; continue; }
    if (SEPARATORS.has(ch)) { endSegment(); continue; }
    if (/\s/.test(ch)) { endToken(); continue; }
    token += ch;
    hasToken = true;
  }
  endSegment();
  return result;
}

function baseName(word) {
  return word.split(/[\\/]/).pop().toLowerCase().replace(/\.exe$/, '');
}

function stripPrefix(tokens) {
  let i = 0;
  while (i < tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i]) || WRAPPERS.has(baseName(tokens[i])))) i++;
  return tokens.slice(i);
}

function gitPushDeletes(args) {
  // args are the words after `push`
  for (const arg of args) {
    if (arg === '--delete' || arg.startsWith('--delete=')) return 'uses --delete';
    if (arg === '--prune' || arg === '--mirror') return `uses ${arg}, which deletes remote branches`;
    if (/^-[A-Za-z]+$/.test(arg) && arg.includes('d')) return 'uses -d';
    if (/^\+?:./.test(arg)) return 'pushes an empty source (the colon form)';
  }
  return null;
}

function checkTokens(tokens) {
  const words = stripPrefix(tokens);
  if (!words.length) return null;
  const tool = baseName(words[0]);
  if (tool === 'git') {
    let i = 1;
    while (i < words.length && words[i].startsWith('-')) {
      i += GIT_OPTIONS_WITH_VALUE.has(words[i]) ? 2 : 1;
    }
    if (words[i] === 'push') return gitPushDeletes(words.slice(i + 1));
    return null;
  }
  if (tool === 'gh' && words[1] === 'api') {
    for (let i = 2; i < words.length; i++) {
      const w = words[i];
      if ((w === '-X' || w === '--method') && (words[i + 1] || '').toUpperCase() === 'DELETE') return 'sends a DELETE through gh api';
      if (/^(-X|--method=)DELETE$/i.test(w)) return 'sends a DELETE through gh api';
    }
  }
  return null;
}

export function reasonToAsk(command, depth = 0) {
  if (typeof command !== 'string' || depth > 3) return null;
  for (const tokens of segments(command)) {
    const found = checkTokens(tokens);
    if (found) return found;
    // A quoted command handed to another shell, such as bash -c "git push origin :x"
    for (const token of tokens) {
      if (/\s/.test(token) && /\b(git|gh)\b/.test(token)) {
        const nested = reasonToAsk(token, depth + 1);
        if (nested) return nested;
      }
    }
  }
  return null;
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const call = JSON.parse(input);
  const reason = reasonToAsk(call?.tool_input?.command);
  if (!reason) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `This command deletes a branch or other remote ref (it ${reason}). Branch deletes always ask Jeremy first.`,
    },
  }));
}

// Runs only when Claude Code calls this file, not when the test imports it.
if (/guard-branch-delete\.mjs$/.test(process.argv[1] || '')) {
  main().catch(() => process.exit(0));
}
