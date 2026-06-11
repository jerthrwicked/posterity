import React from "react";

// The Posterity swallow — wings spread, deeply forked tail. Drawn in a 120×120 space, centered in the 200×200 seal.
const SWALLOW = "M60 36 C72 26 92 20 110 22 C96 34 80 46 66 54 C65 58 64 62 63 66 L69 94 L60 77 L51 94 L57 66 C56 62 55 58 54 54 C40 46 24 34 10 22 C28 20 48 26 60 36 Z";

export function Logomark({ size = 40, seal = true, star = true, doubleRing = true, ringWidth = 2, className = "", style, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      style={{ display: "block", color: "inherit", overflow: "visible", ...style }}
      role="img"
      aria-label="Posterity"
      {...rest}
    >
      {seal && (
        <>
          <circle cx="100" cy="100" r="91" fill="none" stroke="currentColor" strokeWidth={ringWidth} />
          {doubleRing && (
            <circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
          )}
          {star && (
            <path d="M100 159 L102.4 165.6 L109 167 L102.4 168.4 L100 175 L97.6 168.4 L91 167 L97.6 165.6 Z" fill="currentColor" opacity="0.85" />
          )}
        </>
      )}
      <g transform={seal ? "translate(100,94) scale(0.56) translate(-60,-58)" : "translate(100,100) scale(1.4) translate(-60,-58)"}>
        <path d={SWALLOW} fill="currentColor" />
      </g>
    </svg>
  );
}
