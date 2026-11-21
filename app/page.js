import HomePlans from "./components/HomePlans";
import { Logomark } from "./components/brand/Logomark";
import { BandPulse } from "./components/Glow";
import { LegacyCalendars, PreviewSwitch, AuditShield, HandwrittenNote } from "./components/HomeArt";

const PHASE_HUES = ["#93ab99", "#a1b095", "#a1a787", "#b1ac85", "#b6a37a", "#c0a176"];

const PHASES = [
  { name: "Horizon", copy: "Your legacy starts here. Build your account before committing." },
  { name: "Planning", copy: "Some or all of the plans within your account have received funding. Content continues to be created and refined." },
  { name: "Interlude", copy: "A period of waiting between the triggering of your account and its activation." },
  { name: "Active", copy: "Your account is live. The custom content you’ve created is delivered to your loved ones in the exact way, at the exact time you designed it to be." },
  { name: "Reprise", copy: "A neutral, free year. If you choose, Legacy Guards can gather and download approved content within your account." },
  // Approved copy, from the specification's Brand Copy. Used exactly as written.
  { name: "Posterity", copy: "Your Posterity account will become a living representation of the legacy you created." },
];

// The three points under the first screen, each with its drawing. "Total Accountability" replaced
// "Fully Automated. Fully Protected" on November 16, 2026, since its legacy fund left the specification.
const POINTS = [
  { title: "A Living Legacy", Art: LegacyCalendars, artWidth: "lg:w-[299px]", copy: "Build a custom delivery calendar of messages, videos, and memories. Your content reaches the people you choose, on the dates you set — long after you’re gone." },
  { title: "On Your Terms", Art: PreviewSwitch, artWidth: "lg:w-[264px]", copy: "You build it. You preview it. You control it. Nothing moves until you’re ready — and when you are, your account begins its journey through six carefully designed phases." },
  { title: "Total Accountability", Art: AuditShield, artWidth: "lg:w-[248px]", copy: "Posterity answers to you now, and to the Legacy Guards you name after you’re gone. Every payment, refund, and transfer carries a full audit trail." },
];

// The Posterity phase ends the line as a gold circle with the swallow cut out of it in black.
function PosterityCircle({ className = "", swallow = "" }) {
  return (
    <span className={`phase-circle ${className}`}>
      <Logomark form="swallow" size={18} className={swallow} />
    </span>
  );
}

export default function Home() {
  return (
    <main className="bg-black text-white">
      {/* First screen. Below 1024px it fills the phone's screen under the 93px menu bar. On a phone the seal and the two lines sit at its foot,
          so the note starts just after a scroll. A third of the screen's spare room, up to 32px, goes between the headline and the seal, and the rest above the headline. On a tablet the first screen is only as tall as what it holds, so the note follows 39px below the delivery line, as on a phone.
          On a phone too short to hold them, the space above the headline, the headline, the seal and the space around it shrink together (.home-first in globals.css).
          From 1024px it is only as tall as what it holds: the headline and the line on the left, and the
          note on the right with the seal as its stamp. A white glow falls from the top. */}
      <section className="home-first relative flex min-h-[calc(100svh-93px)] flex-col justify-end overflow-hidden md:min-h-0 md:pt-[88px] px-6 pt-[60px] pb-[26px] text-center lg:block lg:min-h-0 lg:px-16 lg:pt-[88px] lg:pb-24 lg:text-left">
        <div aria-hidden="true" className="home-glow posterity-glow--breathe" />
        <div className="relative mx-auto flex w-full max-w-[1052px] flex-1 flex-col items-center md:flex-none lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center lg:gap-[72px] min-[1700px]:max-w-[1152px]">
          <div className="flex flex-1 flex-col items-center md:flex-none lg:items-start">
            <div aria-hidden="true" className="grow-[2] basis-0 md:hidden" />
            <h1 className="home-first__head text-[clamp(2.75rem,16.5vw,3.75rem)] font-bold leading-[0.98] tracking-[-0.035em] lg:text-[length:clamp(80px,6.6vw,116px)] lg:leading-[0.96] lg:tracking-[-0.04em]">
              <span className="whitespace-nowrap">Your Voice.</span>
              <br />
              <span className="home-forever whitespace-nowrap">Forever.</span>
            </h1>
            <div aria-hidden="true" className="max-h-8 grow basis-0 md:hidden" />
            <div className="home-first__seal mt-9 mb-[34px] lg:hidden">
              <Logomark form="primary" rings="phases" ringsId="seal-rings-first-screen" size={120} className="text-white" />
            </div>
            {/* The line: in a white outline pill below 1024px, as plain text from 1024px */}
            <p className="serif-accent inline-block max-w-[312px] rounded-full border border-white px-[26px] py-[14px] text-[17px] leading-[1.4] lg:mt-10 lg:max-w-[540px] lg:rounded-none lg:border-0 lg:p-0 lg:text-[24px]" style={{ color: "#c0a176" }}>
              The love and memories you shared in life, reaching forward into tomorrow
            </p>
            <p className="mx-auto max-w-[300px] pt-[14px] text-[15px] leading-[1.55] text-gray-300 lg:mx-0 lg:max-w-[540px] lg:pt-3 lg:text-lg">
              Delivered to the ones you love, even after you&rsquo;re gone
            </p>
          </div>
          <div className="hidden lg:flex lg:min-h-[360px] lg:items-center lg:justify-center">
            <HandwrittenNote ringsId="seal-rings-note-computer" />
          </div>
        </div>
      </section>

      {/* The note under the first screen, below 1024px */}
      <div className="flex justify-center px-6 pt-[18px] pb-8 lg:hidden">
        <HandwrittenNote ringsId="seal-rings-note-phone" />
      </div>

      {/* The three points, each with its drawing: a white band below 1024px with each drawing beside its words, and from 1024px
          one white card, 880px wide, whose rows alternate sides */}
      <section className="bg-[color:var(--paper)] px-6 py-[26px] text-[color:var(--paper-ink)] lg:bg-transparent lg:px-16 lg:pt-0 lg:pb-20">
        <div className="mx-auto max-w-[640px] lg:max-w-[880px] lg:rounded-2xl lg:bg-[color:var(--paper)] lg:px-14">
          {POINTS.map(({ title, Art, artWidth, copy }, i) => (
            <div
              key={title}
              className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-x-4 border-t border-[#e6e6e6] py-3.5 first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-2 lg:items-center lg:gap-x-16 lg:gap-y-0 lg:py-9 lg:first:pt-9 lg:last:pb-9"
            >
              <div className={`flex justify-center ${i % 2 ? "lg:order-2" : ""}`}>
                <Art className={`h-auto w-full max-w-[100px] lg:max-w-full ${artWidth}`} />
              </div>
              <div className="grid content-start gap-[5px] lg:gap-3.5">
                <h3 className="text-base font-bold leading-[1.25] lg:text-[28px] lg:leading-[1.15] lg:tracking-[-0.015em]">{title}</h3>
                <p className="text-[13px] leading-[1.5] text-[color:var(--paper-ink-3)] lg:max-w-[420px] lg:text-base lg:leading-[1.65]">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Six Phases band. Below 1024px the phases run down one line, each name beside its words; from 1024px they run across one line.
          The line runs through the six phase colors and ends in the Posterity circle. */}
      <div
        style={{
          background: "linear-gradient(180deg, #0f1512 0%, #000000 100%)",
          borderTop: "1px solid rgba(147,171,153,0.45)",
          borderBottom: "1px solid #2c3f35",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <BandPulse />
        <section className="relative mx-auto max-w-[60rem] px-6 pt-7 pb-[30px] lg:max-w-[1240px] lg:px-16 lg:py-[72px]">
          <h2 className="text-[22px] md:text-4xl leading-[1.15] font-bold text-center mb-2">Six Phases. One Journey.</h2>
          <p className="serif-accent mx-auto mb-4 max-w-[300px] text-center text-[14.5px] leading-[1.45] md:max-w-none md:text-xl lg:mb-0" style={{ color: "#c0a176" }}>Every Posterity account moves through six carefully designed phases.</p>

          <ol className="phases-down lg:hidden">
            {PHASES.map((phase, i) => (
              <li key={phase.name} style={{ "--from": PHASE_HUES[i], "--to": PHASE_HUES[i + 1] }}>
                {i === PHASES.length - 1 ? (
                  <PosterityCircle className="phase-end" swallow="h-3.5 w-3.5" />
                ) : (
                  <span className="phase-pip" style={{ background: PHASE_HUES[i] }} />
                )}
                <div>
                  <p className="text-[10px] leading-[1.2] tabular-nums tracking-wider text-[color:var(--text-quiet)]">{String(i + 1).padStart(2, "0")}</p>
                  <p className="phase-name text-sm leading-[1.25] font-semibold" style={{ color: PHASE_HUES[i] }}>{phase.name}</p>
                </div>
                <p className="pt-px text-[11.5px] leading-[1.45] text-gray-400">{phase.copy}</p>
              </li>
            ))}
          </ol>

          <ol className="phases-line hidden lg:grid">
            {PHASES.map((phase, i) => (
              <li key={phase.name}>
                {i === PHASES.length - 1 ? (
                  <PosterityCircle className="phase-end" swallow="h-[18px] w-[18px]" />
                ) : (
                  <span className="phase-pip" style={{ background: PHASE_HUES[i] }} />
                )}
                <p className="mb-1.5 text-[11px] tabular-nums tracking-[0.12em] text-[color:var(--text-quiet)]">{String(i + 1).padStart(2, "0")}</p>
                <p className="text-[19px] font-semibold" style={{ color: PHASE_HUES[i] }}>{phase.name}</p>
                <p className="mt-2 text-[13.5px] leading-[1.6] text-gray-400">{phase.copy}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Plans */}
      <section className="py-10 lg:py-20">
        <div className="text-center px-6 mb-6 lg:mb-9">
          <h2 className="text-[28px] md:text-4xl leading-[1.15] font-bold mb-2">Plans for every legacy</h2>
          <p className="text-gray-400 text-[15px] md:text-lg">Start building on Horizon. Pay for your plan — or plans — when you&rsquo;re ready.</p>
        </div>
        <HomePlans />
      </section>

      {/* The product explanation, as a letter. Approved copy, from the specification's Brand Copy:
          the words are exact, and only the paragraph breaks are new. It fits one phone screen, and from 768px it is 620px wide, the shape of a letter-size sheet. */}
      <section className="px-3 py-[18px] md:px-16 md:pt-0 md:pb-20">
        <article className="home-letter mx-auto max-w-[620px]">
          <p className="home-letter__open">With Posterity, you create a custom tailored legacy that will - on your terms - reach whatever goal or goals you design for it.</p>
          <p>Do you want your plans to slowly unfold an interconnected story, shared across 52 messages to 52 of your closest friends? Perhaps you want to let them know they all have a piece of your tale in a final Facebook post, and that they will need to work with one another to piece it all together. Maybe-in the multitude of comments that will likely ensue-they will not only reconnect with each other, but also rediscover the legacy you left in all of their lives.</p>
          <p>The only limit is your creativity, and as you journey back through your life to create your legacy, you are building an account that will journey forward.</p>
          <p>Your Posterity account can be <span className="home-hand">a secret, a confession, a reminder, a remembrance, a photo album</span> - it can solely be a way for your loved ones to relive the joy you&rsquo;ve shared together.</p>
          <p className="home-letter__end">Your legacy is whatever you want it to be, and it starts now.</p>
          <Logomark form="compact" size={44} className="mx-auto mt-3.5 h-7 w-7 text-[color:var(--paper-gold)] md:mt-[26px] md:h-11 md:w-11" />
        </article>
      </section>

      {/* Closing: the line and the stacked lockup in a white horizon light. The line is set small and close above the logo, so it
          reads as the logo's line rather than the letter's (November 21, 2026). The page has no footer. */}
      <section className="relative overflow-hidden px-6 pt-16 pb-10 md:px-8 md:pt-28 md:pb-[72px] text-center">
        <div aria-hidden="true" className="home-horizon" />
        <p className="serif-accent relative mx-auto max-w-[240px] md:max-w-[520px] text-[18px] md:text-[24px] leading-[1.4]" style={{ color: "#c0a176" }}>
          Say the things too important to leave unsaid
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed brand file, as on the Legacy page */}
        <img
          src="/brand/posterity-lockup-stacked-white.png"
          alt="Posterity"
          width={1333}
          height={1107}
          className="relative mx-auto mt-4 md:mt-5 h-auto w-[160px] md:w-[206px]"
        />
      </section>
    </main>
  );
}
