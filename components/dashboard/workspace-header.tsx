import type { Workspace } from "@/lib/types/workspace";
import { getHostname } from "@/lib/analyses/utils";

type WorkspaceHeaderProps = {
  workspace: Workspace;
  compact?: boolean;
};

export function WorkspaceHeader({
  workspace,
  compact = false,
}: WorkspaceHeaderProps) {
  const hostname = getHostname(workspace.brand_url);

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 backdrop-blur-md ${
        compact ? "py-2" : "py-2.5"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-lg bg-linear-to-br from-[#2b185f] to-[#6947ff] font-bold text-white shadow-[0_4px_14px_rgba(105,71,255,0.28)] ${
          compact ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs"
        }`}
      >
        {workspace.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p
          className={`truncate font-semibold text-text-primary ${
            compact ? "text-sm" : "text-base"
          }`}
        >
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
