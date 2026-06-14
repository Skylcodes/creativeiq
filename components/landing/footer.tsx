export function Footer() {
  const links = {
    Product: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Agents", href: "#agents" },
      { label: "Report", href: "#output" },
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
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <a href="#" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-accent to-[#9333ea]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8L7 4L11 8L7 12L3 8Z" fill="white" fillOpacity="0.9" />
                </svg>
              </span>
              <span className="font-display text-lg font-semibold text-text-primary">
                CreativeIQ
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-secondary">
              AI-powered Ad Creative + Funnel Intelligence for E-Commerce and
              DTC brands. Validate before you spend.
            </p>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {category}
              </p>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} CreativeIQ. All rights reserved.
          </p>
          <p className="text-xs text-text-muted">
            Built for DTC founders, media buyers, and creative strategists.
          </p>
        </div>
      </div>
    </footer>
  );
}
