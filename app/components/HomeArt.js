// The homepage's pictures, added November 20, 2026 (homepage review, rounds 22 to 24):
// a line drawing for each of the three points, drawn in the paper colors, and the
// handwritten note with the seal pressed into its corner.
import { Logomark } from "./brand/Logomark";

const INK = "#3d3d3d"; // --paper-ink-2
const SAGE = "#4f6b57"; // --paper-sage
const GOLD = "#7a5e35"; // --paper-gold
const OLIVE = "#656446"; // halfway from sage to gold, for June
const QUIET = "#6b6b6b"; // --paper-quiet
const BAR = "#dcdcdc";
const BAR_PALE = "#ececec";
const SCREEN = "#f2f2f2";

// A Living Legacy: three months, each with one delivery date filled and one ringed.
const MONTHS = [
  { name: "MAY", color: SAGE, start: 3, days: 31, filled: 9, ringed: 24, y: 10 },
  { name: "JUNE", color: OLIVE, start: 6, days: 30, filled: 4, ringed: 17, y: 0 },
  { name: "JULY", color: GOLD, start: 1, days: 31, filled: 12, ringed: 30, y: 10 },
];
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export function LegacyCalendars({ className = "" }) {
  return (
    <svg viewBox="-2 -2 374 158" width="374" height="158" className={className} aria-hidden="true">
      {MONTHS.map((m, k) => (
        <g key={m.name} transform={`translate(${k * 128},${m.y})`}>
          <rect x="0.75" y="6.75" width="114.5" height="136.5" rx="9" fill="#fff" stroke={INK} strokeWidth="1.5" />
          <path d="M0.75 15.75a9 9 0 0 1 9-9h96.5a9 9 0 0 1 9 9V31H0.75Z" fill={m.color} />
          <line x1="30" y1="0" x2="30" y2="13" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="85" y1="0" x2="85" y2="13" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <text x="57.5" y="23.5" textAnchor="middle" fontSize="9" fontWeight="600" letterSpacing="1.6" fill="#fff" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
            {m.name}
          </text>
          <g style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}>
            {WEEK.map((d, i) => (
              <text key={i} x={12 + i * 15.2} y="44" textAnchor="middle" fontSize="6.5" fill={QUIET}>
                {d}
              </text>
            ))}
            {Array.from({ length: m.days }, (_, j) => {
              const day = j + 1;
              const at = m.start + j;
              const cx = 12 + (at % 7) * 15.2;
              const cy = 58 + Math.floor(at / 7) * 15.5;
              const filled = day === m.filled;
              return (
                <g key={day}>
                  {filled && <circle cx={cx} cy={cy - 2.6} r="6.4" fill={m.color} />}
                  {day === m.ringed && <circle cx={cx} cy={cy - 2.6} r="6.4" fill="none" stroke={m.color} strokeWidth="1.3" />}
                  <text x={cx} y={cy} textAnchor="middle" fontSize="7.2" fontWeight={filled ? 700 : 400} fill={filled ? "#fff" : INK}>
                    {day}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      ))}
    </svg>
  );
}

// On Your Terms: a preview with an eye on it, a switch turned on, and a lock.
export function PreviewSwitch({ className = "" }) {
  return (
    <svg viewBox="0 0 330 160" width="330" height="160" className={className} aria-hidden="true">
      <rect x="1" y="1" width="196" height="150" rx="12" fill="#fff" stroke={INK} strokeWidth="1.5" />
      <rect x="15" y="15" width="168" height="84" rx="7" fill={SCREEN} />
      <path d="M67 57 Q99 31 131 57 Q99 83 67 57Z" fill="none" stroke={SAGE} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="99" cy="57" r="9" fill="none" stroke={SAGE} strokeWidth="2" />
      <circle cx="99" cy="57" r="3" fill={SAGE} />
      <rect x="15" y="113" width="104" height="7" rx="3.5" fill={BAR} />
      <rect x="15" y="128" width="66" height="7" rx="3.5" fill={BAR_PALE} />
      <rect x="226" y="30" width="86" height="42" rx="21" fill="#fff" stroke={INK} strokeWidth="1.5" />
      <circle cx="291" cy="51" r="15" fill={SAGE} />
      <path d="M257 108v-11a12 12 0 0 1 24 0v11" fill="none" stroke={GOLD} strokeWidth="2" />
      <rect x="250" y="108" width="38" height="31" rx="6" fill="#fff" stroke={GOLD} strokeWidth="2" />
      <circle cx="269" cy="121" r="3" fill={GOLD} />
      <line x1="269" y1="123" x2="269" y2="130" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Total Accountability: a shield holding the swallow, beside a checked list.
export function AuditShield({ className = "" }) {
  return (
    <svg viewBox="0 0 310 160" width="310" height="160" className={className} aria-hidden="true">
      <path d="M62 6 L114 22 V72 C114 112 90 138 62 152 C34 138 10 112 10 72 V22 Z" fill="#fff" stroke={SAGE} strokeWidth="2" strokeLinejoin="round" />
      <Logomark form="swallow" size={69.4} x={27.3} y={39} style={{ color: SAGE }} />
      {[92, 64, 110, 76].map((w, i) => {
        const y = 22 + i * 34;
        return (
          <g key={y}>
            <circle cx="168" cy={y} r="10" fill="none" stroke={GOLD} strokeWidth="1.6" />
            <path d={`M163 ${y} l3.6 3.6 l6.4 -7`} fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="190" y={y - 3.5} width={w} height="7" rx="3.5" fill={i % 2 ? BAR_PALE : BAR} />
          </g>
        );
      })}
    </svg>
  );
}

// The handwritten note, with the seal pressed into its corner like a wax stamp.
// Its words are the example from Walker's site, holding the place until the copy work writes ours.
// The homepage shows it twice: beside the headline from 1024px, and under the first screen below that.
export function HandwrittenNote({ ringsId }) {
  return (
    <figure className="home-note">
      <div className="home-note__paper">
        <p>Happy birthday, sweetheart.</p>
        <p>I recorded this one early, just to be sure I&rsquo;d be there.</p>
        <p className="home-note__sign">&mdash; Mom</p>
      </div>
      <div className="home-note__stamp">
        <Logomark form="primary" rings="phases" ringsId={ringsId} size={92} className="h-12 w-12 text-white lg:h-[92px] lg:w-[92px]" />
      </div>
    </figure>
  );
}
