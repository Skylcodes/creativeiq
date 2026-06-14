"use client";

import { useState, useTransition } from "react";
import {
  createCustomTag,
  renameCustomTag,
  deleteCustomTag,
} from "@/lib/hooks/actions";

type ManageTagsModalProps = {
  workspaceId: string;
  tags: string[];
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function ManageTagsModal({
  workspaceId,
  tags,
  open,
  onClose,
  onChanged,
}: ManageTagsModalProps) {
  const [newTag, setNewTag] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="font-display text-lg font-semibold">Manage tags</h2>
        <p className="mt-1 text-sm text-text-secondary">Workspace-specific tags for organizing hooks.</p>

        <div className="mt-4 flex gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag name"
            className="flex-1 rounded-xl border border-black/[0.08] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !newTag.trim()}
            onClick={() =>
              startTransition(async () => {
                await createCustomTag(workspaceId, newTag);
                setNewTag("");
                onChanged();
              })
            }
            className="btn-primary text-sm"
          >
            Add
          </button>
        </div>

        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {tags.length === 0 && (
            <li className="text-sm text-text-muted">No custom tags yet.</li>
          )}
          {tags.map((tag) => (
            <li key={tag} className="flex items-center gap-2 rounded-xl bg-black/[0.02] px-3 py-2">
              {editing === tag ? (
                <>
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-lg border px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await renameCustomTag(workspaceId, tag, editValue);
                        setEditing(null);
                        onChanged();
                      })
                    }
                    className="text-xs font-semibold text-accent"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{tag}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(tag);
                      setEditValue(tag);
                    }}
                    className="text-xs text-text-muted hover:text-accent"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteCustomTag(workspaceId, tag);
                        onChanged();
                      })
                    }
                    className="text-xs text-red-600"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <button type="button" onClick={onClose} className="mt-4 w-full btn-secondary text-sm">
          Done
        </button>
      </div>
    </div>
  );
}
