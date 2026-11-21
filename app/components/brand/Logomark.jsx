import React from "react";

// The Posterity swallow — wings spread, deeply forked tail. Drawn in a 120×120 space.
// The only copy of the swallow in the site's code. The files in public/brand match it.
const SWALLOW = "M60 36 C72 26 92 20 110 22 C96 34 80 46 66 54 C65 58 64 62 63 66 L69 94 L60 77 L51 94 L57 66 C56 62 55 58 54 54 C40 46 24 34 10 22 C28 20 48 26 60 36 Z";

// The three forms the Website Design Standards name, each matching its files in public/brand.
// primary: double ring and star, for large placements (posterity-seal-*).
// compact: one heavy ring, for anything shown under about 48px (posterity-seal-compact-*).
// swallow: the bird alone (posterity-swallow-*).
//
// rings="phases" draws the primary seal's two rings in the six phase colors, jade on the
// left through evening gold on the right, the same run of color as "Forever." on the
// homepage. The swallow and the star keep the seal's own color. Approved by Jeremy on
// November 16, 2026, for the homepage's first screen. Give each phase-ring seal on a page
// its own ringsId, since a seal hidden at one screen width can't lend its rings to another.
const PHASE_RINGS = "posterity-seal-phase-rings";

export function Logomark({ size = 48, form = "compact", rings, ringsId = PHASE_RINGS, className = "", style, ...rest }) {
  const ring = form === "primary" && rings === "phases" ? `url(#${ringsId})` : "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox={form === "swallow" ? "4 1.5 112 112" : "0 0 200 200"}
      fill="none"
      className={className}
      style={{ display: "block", color: "inherit", overflow: "visible", ...style }}
      aria-hidden="true"
      {...rest}
    >
      {form === "primary" && (
        <>
          {rings === "phases" && (
            <defs>
              <linearGradient id={ringsId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#93ab99" />
                <stop offset="0.2" stopColor="#a1b095" />
                <stop offset="0.4" stopColor="#a1a787" />
                <stop offset="0.6" stopColor="#b1ac85" />
                <stop offset="0.8" stopColor="#b6a37a" />
                <stop offset="1" stopColor="#c0a176" />
              </linearGradient>
            </defs>
          )}
          <circle cx="100" cy="100" r="91" fill="none" stroke={ring} strokeWidth="2" />
          <circle cx="100" cy="100" r="82" fill="none" stroke={ring} strokeWidth="0.75" opacity="0.5" />
          <path d="M100 159 L102.4 165.6 L109 167 L102.4 168.4 L100 175 L97.6 168.4 L91 167 L97.6 165.6 Z" fill="currentColor" opacity="0.85" />
          <g transform="translate(100,94) scale(0.56) translate(-60,-58)">
            <path d={SWALLOW} fill="currentColor" />
          </g>
        </>
      )}
      {form === "compact" && (
        <>
          <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="6" />
          <g transform="translate(100,100) scale(0.62) translate(-60,-58)">
            <path d={SWALLOW} fill="currentColor" />
          </g>
        </>
      )}
      {form === "swallow" && <path d={SWALLOW} fill="currentColor" />}
    </svg>
  );
}
