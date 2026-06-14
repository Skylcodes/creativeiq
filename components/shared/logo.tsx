import Link from "next/link";

type LogoProps = {
  href?: string;
  size?: "sm" | "md";
};

export function Logo({ href = "/", size = "md" }: LogoProps) {
  const iconSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const textSize = size === "sm" ? "text-base" : "text-lg";

  const content = (
    <>
      <span
        className={`flex ${iconSize} items-center justify-center rounded-lg bg-linear-to-br from-accent to-[#9333ea] shadow-[0_2px_12px_rgba(110,58,255,0.35)]`}
      >
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
        className={`font-display ${textSize} font-semibold tracking-tight text-text-primary`}
      >
        CreativeIQ
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
