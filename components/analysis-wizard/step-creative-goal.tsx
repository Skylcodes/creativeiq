"use client";

import {
  CREATIVE_GOALS,
  type CreativeGoal,
} from "@/lib/analyses/creative-goals";

function GoalIcon({ icon }: { icon: string }) {
  const cls = "h-6 w-6";

  switch (icon) {
    case "cart":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 6H20L18 14H8L6 6Z"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="18" r="1.5" fill="#6947ff" />
          <circle cx="17" cy="18" r="1.5" fill="#6947ff" />
          <path
            d="M6 6L5 3H3"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "leads":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="4"
            y="5"
            width="16"
            height="14"
            rx="2"
            stroke="#6947ff"
            strokeWidth="1.5"
          />
          <path
            d="M8 10H16M8 14H13"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M16 8L18 10L16 12"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "awareness":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8" stroke="#6947ff" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" fill="#6947ff" fillOpacity="0.35" />
          <path
            d="M12 4V6M12 18V20M4 12H6M18 12H20"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "sale":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 9L12 4L20 9V19C20 19.552 19.552 20 19 20H5C4.448 20 4 19.552 4 19V9Z"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M9 14C9 15.657 10.343 17 12 17C13.657 17 15 15.657 15 14"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "launch":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3L14 9L20 11L14 13L12 19L10 13L4 11L10 9L12 3Z"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "retarget":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 8C6 5.791 7.791 4 10 4H14C16.209 4 18 5.791 18 8V12"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M15 11L18 14L15 17"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 14H18"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8" stroke="#6947ff" strokeWidth="1.5" />
        </svg>
      );
  }
}

type StepCreativeGoalProps = {
  selected: CreativeGoal | null;
  onSelect: (goal: CreativeGoal) => void;
};

export function StepCreativeGoal({
  selected,
  onSelect,
}: StepCreativeGoalProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
        What is this ad&apos;s goal?
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        This shapes how every agent evaluates your creative and how scores are
        calibrated. A brand awareness ad is graded differently than a conversion
        ad.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {CREATIVE_GOALS.map((goal) => {
          const isSelected = selected === goal.id;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => onSelect(goal.id)}
              className={`flex flex-col items-start gap-3 p-5 text-left transition-all duration-200 ${
                isSelected
                  ? "premium-card premium-card-accent ring-2 ring-accent/20"
                  : "premium-card premium-card-interactive"
              }`}
            >
              <div
                className={`icon-badge flex h-11 w-11 items-center justify-center rounded-xl ${
                  isSelected ? "bg-accent/15" : "bg-accent/[0.08]"
                }`}
              >
                <GoalIcon icon={goal.icon} />
              </div>
              <div>
                <p className="font-semibold text-text-primary">{goal.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                  {goal.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
