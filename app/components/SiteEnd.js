"use client";
// The end of every page but the homepage (November 21, 2026): the stacked logo in the white light rising from the
// bottom, with no line and no year. The homepage keeps its own closing, with "Say the things too important to leave unsaid."
import { usePathname } from "next/navigation";

export default function SiteEnd() {
  const path = usePathname();
  if (path === "/") return null;
  return (
    <footer className="relative overflow-hidden bg-black px-6 pt-14 pb-10 text-center md:pt-20 md:pb-[72px]">
      <div aria-hidden="true" className="home-horizon" />
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed brand file, as on the homepage */}
      <img
        src="/brand/posterity-lockup-stacked-white.png"
        alt="Posterity"
        width={1333}
        height={1107}
        className="relative mx-auto h-auto w-[120px] md:w-[150px]"
      />
    </footer>
  );
}
