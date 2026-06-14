import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 mesh-gradient" />
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-50" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-accent-secondary/8 blur-3xl" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Logo href="/" />
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-8 shadow-[0_24px_64px_rgba(110,58,255,0.08),0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {subtitle}
            </p>
          </div>

          {children}
        </div>

        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  );
}
