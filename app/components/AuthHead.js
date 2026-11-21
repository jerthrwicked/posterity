// The sign-in pages' heading (November 21, 2026): the seal with its rings in the six phase colors,
// and the page's line as a headline in the homepage's style. The menu bar above already carries the
// wordmark, so the heading doesn't repeat it.
import Link from "next/link";
import { Logomark } from "./brand/Logomark";

export function AuthHead({ line }) {
  return (
    <div className="mb-10 flex flex-col items-center text-center">
      <Link href="/" aria-label="Posterity" className="inline-flex">
        <Logomark form="primary" rings="phases" ringsId="seal-rings-sign-in" size={104} className="h-[88px] w-[88px] text-white md:h-[104px] md:w-[104px]" />
      </Link>
      {line && (
        <h1 className="mt-6 text-[44px] font-bold leading-[0.98] tracking-[-0.035em] md:text-[60px]">{line}</h1>
      )}
    </div>
  );
}
