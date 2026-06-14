type AgentIconProps = {
  icon: string;
  active?: boolean;
  size?: number;
};

export function AgentIcon({ icon, active = true, size = 20 }: AgentIconProps) {
  const color = active ? "#6e3aff" : "#a1a1aa";

  switch (icon) {
    case "buyer":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="7" r="3" stroke={color} strokeWidth="1.4" />
          <path d="M5 17C5 13.5 7.5 12 10 12C12.5 12 15 13.5 15 17" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "rival":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M4 16L8 8L12 12L16 4" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "critic":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 4L12 8L16 9L13 12L14 16L10 14L6 16L7 12L4 9L8 8L10 4Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      );
    case "contrarian":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M6 6L14 14M14 6L6 14" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.4" />
        </svg>
      );
    case "verdict":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 3L12 7L16 8L13 11L14 15L10 13L6 15L7 11L4 8L8 7L10 3Z" fill={active ? "#6e3aff" : "none"} stroke={color} strokeWidth="1.3" />
        </svg>
      );
    default:
      return null;
  }
}
