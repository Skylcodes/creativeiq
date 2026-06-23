import Link from "next/link";

type LogoProps = {
  href?: string;
  size?: "sm" | "md";
  tone?: "light" | "dark";
};

export function Logo({ href = "/", size = "md", tone = "light" }: LogoProps) {
  const iconSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const textSize = size === "sm" ? "text-base" : "text-lg";
  const textColor = tone === "dark" ? "text-white" : "text-text-primary";

  const content = (
    <>
      <span
        className={`relative flex ${iconSize} items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-[linear-gradient(145deg,#21124f_0%,#6947ff_54%,#2f7dff_100%)] shadow-[0_1px_1px_rgba(255,255,255,0.22)_inset,0_10px_24px_rgba(105,71,255,0.28)]`}
      >
        <span className="absolute inset-x-1 top-0 h-px bg-white/35" />
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3 8L7 4L11 8L7 12L3 8Z"
            fill="white"
            fillOpacity="0.9"
          />
          <circle cx="11" cy="5" r="2" fill="white" fillOpacity="0.6" />
        </svg>
      </span>
      <span
        className={`font-display ${textSize} font-semibold tracking-[-0.035em] ${textColor}`}
      >
        Advara
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group flex items-center gap-2.5">
        {content}
      </Link>
    );
  }

  return <div className="flex items-center justify-center gap-2.5">{content}</div>;
}
