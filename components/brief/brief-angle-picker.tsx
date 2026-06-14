"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { selectBriefAngle } from "@/lib/briefs/actions";
import type { BriefAngleOption, CreativeBrief } from "@/lib/types/brief";

type BriefAnglePickerProps = {
  brief: CreativeBrief;
  angles: BriefAngleOption[];
};

export function BriefAnglePicker({ brief, angles }: BriefAnglePickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDevelop() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const result = await selectBriefAngle(brief.id, selected);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }
      await fetch(`/api/briefs/${brief.id}/run`, { method: "POST" });
      window.location.reload();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-4xl px-5 py-12 md:px-8">
      <div className="pointer-events-none absolute inset-0 mesh-gradient opacity-40" />
      <div className="relative text-center">
        <h1 className="font-display text-3xl font-semibold text-text-primary">
          Choose your angle
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-text-secondary">
          Three distinct creative directions built for your brand and audience.
          Pick one to develop into a full production brief.
        </p>
      </div>

      <div className="relative mt-10 grid gap-5 md:grid-cols-3">
        {angles.map((angle, i) => {
          const isSelected = selected === angle.id;
          return (
            <motion.button
              key={angle.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelected(angle.id)}
              className={`rounded-2xl p-6 text-left transition-all ${
                isSelected
                  ? "bg-white shadow-[0_16px_48px_rgba(110,58,255,0.18)] ring-2 ring-accent"
                  : "bg-white/80 ring-1 ring-black/[0.06] hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(110,58,255,0.1)]"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                Option {i + 1}
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold text-text-primary">
                {angle.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {angle.description}
              </p>
              <p className="mt-4 text-xs text-text-muted">
                <span className="font-semibold text-text-secondary">Emotion:</span>{" "}
                {angle.emotionalHook}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                <span className="font-semibold text-text-secondary">Format:</span>{" "}
                {angle.productionFormat}
              </p>
            </motion.button>
          );
        })}
      </div>

      {error && (
        <p className="relative mt-6 text-center text-sm text-[#ef4444]" role="alert">
          {error}
        </p>
      )}

      <div className="relative mt-8 flex justify-center">
        <button
          type="button"
          onClick={handleDevelop}
          disabled={!selected || loading}
          className="btn-primary min-w-[240px] disabled:opacity-40"
        >
          {loading ? "Generating full brief..." : "Develop This Angle"}
        </button>
      </div>

      <p className="relative mt-4 text-center">
        <Link href="/brief" className="text-sm text-text-muted hover:text-accent">
          Back to briefs
        </Link>
      </p>
    </div>
  );
}
