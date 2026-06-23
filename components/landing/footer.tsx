import { Logo } from "@/components/shared/logo";

export function Footer() {
  const links = {
    Product: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Agents", href: "#agents" },
      { label: "Features", href: "#output" },
      { label: "Pricing", href: "#final-cta" },
    ],
    Company: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
    Legal: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  };

  return (
    <footer className="landing-section-footer relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent/30 to-transparent" />
      <div className="pointer-events-none absolute -right-32 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo href="/" size="sm" tone="dark" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              AI-powered Ad Creative + Funnel Intelligence for E-Commerce and
              DTC brands. Validate before you spend.
            </p>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                {category}
              </p>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="rounded-full px-2 py-1 text-sm text-white/55 transition-colors hover:bg-white/8 hover:text-white"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Advara. All rights reserved.
          </p>
          <p className="text-xs text-white/40">
            Built for DTC founders, media buyers, and creative strategists.
          </p>
        </div>
      </div>
    </footer>
  );
}
