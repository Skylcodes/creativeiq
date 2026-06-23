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
      className={`inline-flex items-center gap-3 rounded-xl border border-black/6 bg-white px-3.5 shadow-sm ${
        compact ? "py-2" : "py-2.5"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-lg bg-[#4c3d8f] font-bold text-white ${
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
