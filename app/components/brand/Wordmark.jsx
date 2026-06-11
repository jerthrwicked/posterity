import React from "react";
import { Logomark } from "./Logomark";

const SIZES = { sm: 16, md: 22, lg: 30, xl: 42 };

// Relies on app tokens: --font-sans, --text-primary, --brand-ice (sage), --black.
export function Wordmark({ size = "md", tone = "white", withMark = false, className = "", style, ...rest }) {
  const fs = SIZES[size] || SIZES.md;
  const markSize = Math.round(fs * 1.7);
  const inkColor = tone === "ice" ? "var(--brand-ice)" : tone === "dark" ? "var(--black)" : "var(--text-primary, #ffffff)";
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.6em", color: inkColor, ...style }}
      {...rest}
    >
      {withMark && (
        <span style={{ display: "inline-flex", flexShrink: 0, color: "inherit" }}>
          <Logomark size={markSize} />
        </span>
      )}
      <span style={{
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        letterSpacing: "0.28em",
        textTransform: "uppercase",
        lineHeight: 1,
        fontSize: fs,
        color: inkColor,
      }}>Posterity</span>
    </span>
  );
}
