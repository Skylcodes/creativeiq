import type { Workspace } from "@/lib/types/workspace";
import { getHostname } from "@/lib/analyses/utils";

type WorkspaceHeaderProps = {
  workspace: Workspace;
  compact?: boolean;
};

export function WorkspaceHeader({ workspace, compact = false }: WorkspaceHeaderProps) {
  const hostname = getHostname(workspace.brand_url);

  return (
    <div className={`inline-flex items-center gap-3 rounded-xl bg-black/[0.025] ${compact ? "px-3.5 py-2" : "rounded-2xl px-4 py-2.5"}`}>
      <div className={`flex items-center justify-center rounded-lg bg-linear-to-br from-accent to-[#9333ea] font-bold text-white shadow-[0_2px_10px_rgba(110,58,255,0.25)] ${compact ? "h-8 w-8 text-[11px]" : "h-9 w-9 rounded-xl text-xs"}`}>
        {workspace.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className={`truncate font-display font-semibold text-text-primary ${compact ? "text-sm" : "text-base"}`}>
          {workspace.name}
        </p>
        <a
          href={workspace.brand_url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-xs text-text-muted transition-colors hover:text-accent"
        >
          {hostname}
        </a>
      </div>
    </div>
  );
}
