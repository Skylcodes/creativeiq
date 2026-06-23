"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AuthError } from "@/components/auth/auth-error";
import { AuthInput } from "@/components/auth/auth-input";
import { SubmitButton } from "@/components/auth/submit-button";
import { createWorkspace } from "@/lib/workspaces/actions";

type CreateWorkspaceModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function CreateWorkspaceModal({
  open,
  onClose,
  onSuccess,
  onError,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    const result = await createWorkspace(name, brandUrl, {
      skipOnboarding: true,
    });

    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      setError(result.error);
      onError(result.error);
      setLoading(false);
      return;
    }

    setName("");
    setBrandUrl("");
    onSuccess();
    onClose();
    setLoading(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={loading ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="modal-panel fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="font-display text-lg font-semibold text-text-primary">
              Create new workspace
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Add another brand workspace. You can generate its brand profile
              from the Brand Profile page after creation.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <AuthInput
                label="Brand name"
                name="brandName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Velour Skin Co."
                error={fieldErrors.name}
                required
              />
              <AuthInput
                label="Brand website URL"
                name="brandUrl"
                type="url"
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                placeholder="https://yourbrand.com"
                error={fieldErrors.brandUrl}
                required
              />
              <AuthError message={error} />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="btn-secondary flex-1 text-sm disabled:opacity-60"
                >
                  Cancel
                </button>
                <SubmitButton loading={loading}>Create workspace</SubmitButton>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
