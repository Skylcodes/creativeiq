"use client";

type UserAvatarProps = {
  name: string;
  email: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-16 w-16 text-lg",
  lg: "h-24 w-24 text-2xl",
};

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email.charAt(0) || "U").toUpperCase();
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  const initials = getInitials(name, email);
  const sizeClass = sizeClasses[size];

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ring-2 ring-white/80 ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent to-[#9333ea] font-bold text-white ring-2 ring-white/80 ${sizeClass} ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
