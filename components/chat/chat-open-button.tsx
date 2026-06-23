"use client";

type ChatOpenButtonProps = {
  onClick: () => void;
  className?: string;
};

export function ChatOpenButton({ onClick, className = "" }: ChatOpenButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`dash-btn-secondary text-xs ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M2 3H12V9.5C12 10.3 11.3 11 10.5 11H6L3 13V11H2.5C1.7 11 1 10.3 1 9.5V3.5C1 2.7 1.7 2 2.5 2H2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      Chat with Creative Director
    </button>
  );
}
