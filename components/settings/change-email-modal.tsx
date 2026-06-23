"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AuthInput } from "@/components/auth/auth-input";
import { createClient } from "@/lib/supabase/client";

type ChangeEmailModalProps = {
  open: boolean;
  currentEmail: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function ChangeEmailModal({
  open,
  currentEmail,
  onClose,
  onSuccess,
  onError,
}: ChangeEmailModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = newEmail.trim();
    if (!trimmed) {
      onError("Enter a new email address.");
      return;
    }

    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      onError("That is already your current email.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: trimmed });

      if (error) {
        onError(error.message);
        return;
      }

      onSuccess(
        "Confirmation links were sent to your current and new email addresses. Click the link in your new inbox to finish the change."
      );
      setNewEmail("");
      onClose();
    } catch {
      onError("Could not start email change. Please try again.");
    } finally {
      setLoading(false);
    }
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
            className="modal-panel fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="font-display text-lg font-semibold text-text-primary">
              Change email address
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Supabase will send confirmation links to both{" "}
              <span className="font-medium text-text-primary">{currentEmail}</span>{" "}
              and your new address. The change completes after you confirm from
              the new inbox.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <AuthInput
                label="New email address"
                name="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="btn-secondary flex-1 text-sm disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send confirmation"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
