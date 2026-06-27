import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 mesh-gradient" />
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-45" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[44rem] -translate-x-1/2 rounded-full bg-accent/[0.12] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-accent-tertiary/[0.08] blur-3xl" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Logo href="/" />
        </div>

        <div className="premium-card premium-card-glass rounded-[28px] p-8 shadow-command">
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-semibold tracking-[-0.04em] text-text-primary">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {subtitle}
              </p>
            ) : null}
          </div>

          {children}
        </div>

        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  );
}
