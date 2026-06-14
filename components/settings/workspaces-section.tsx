"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreateWorkspaceModal } from "@/components/settings/create-workspace-modal";
import { DeleteWorkspaceModal } from "@/components/settings/delete-workspace-modal";
import { useToast } from "@/components/shared/toast";
import { deleteWorkspace } from "@/lib/settings/actions";
import type { WorkspaceWithStats } from "@/lib/types/workspace";
import { setActiveWorkspace } from "@/lib/workspaces/actions";

type WorkspacesSectionProps = {
  workspaces: WorkspaceWithStats[];
};

function formatWorkspaceDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkspacesSection({ workspaces }: WorkspacesSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceWithStats | null>(
    null
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  async function handleEdit(workspaceId: string) {
    setSwitchingId(workspaceId);
    const result = await setActiveWorkspace(workspaceId);
    setSwitchingId(null);

    if (!result.success) {
      showToast(result.error ?? "Could not switch workspace.");
      return;
    }

    router.push("/brand");
    router.refresh();
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;

    startDeleteTransition(async () => {
      const result = await deleteWorkspace(deleteTarget.id);
      if (!result.success) {
        showToast(result.error);
        return;
      }

      setDeleteTarget(null);
      showToast("Workspace deleted.");
      router.refresh();
    });
  }

  return (
    <section id="workspaces" className="scroll-mt-24">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Workspaces
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Manage the brands you analyze with CreativeIQ.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-text-primary ring-1 ring-black/[0.08] transition-colors hover:bg-black/[0.02]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Create new workspace
        </button>
      </div>

      <div className="space-y-3">
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className="rounded-2xl bg-white/80 p-5 ring-1 ring-black/[0.04]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-text-primary">
                  {workspace.name}
                </h3>
                <p className="mt-1 truncate text-sm text-text-secondary">
                  {workspace.brand_url}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                  <span>Created {formatWorkspaceDate(workspace.created_at)}</span>
                  <span>
                    {workspace.analysis_count}{" "}
                    {workspace.analysis_count === 1 ? "analysis" : "analyses"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(workspace.id)}
                  disabled={switchingId === workspace.id}
                  className="rounded-xl bg-black/[0.03] px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-accent/8 hover:text-accent disabled:opacity-60"
                >
                  {switchingId === workspace.id ? "Opening…" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(workspace)}
                  disabled={workspaces.length <= 1}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200/80 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    workspaces.length <= 1
                      ? "You must keep at least one workspace"
                      : undefined
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CreateWorkspaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          showToast("Workspace created.");
          router.refresh();
        }}
        onError={showToast}
      />

      <DeleteWorkspaceModal
        open={Boolean(deleteTarget)}
        workspaceName={deleteTarget?.name ?? ""}
        analysisCount={deleteTarget?.analysis_count ?? 0}
        deleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !isDeleting && setDeleteTarget(null)}
      />
    </section>
  );
}
