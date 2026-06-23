"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { ChangeEmailModal } from "@/components/settings/change-email-modal";
import { useToast } from "@/components/shared/toast";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  changePassword,
  signOutOtherSessions,
  updateAvatarUrl,
  updateProfileName,
} from "@/lib/settings/actions";
import { uploadAvatarFile } from "@/lib/settings/avatar";

type ProfileSectionProps = {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
};

export function ProfileSection({
  email,
  fullName: initialFullName,
  avatarUrl: initialAvatarUrl,
  onAvatarChange,
}: ProfileSectionProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();

  const nameDirty = fullName.trim() !== initialFullName.trim();

  function handleSaveName() {
    startSaveTransition(async () => {
      const result = await updateProfileName(fullName);
      if (!result.success) {
        showToast(result.error);
        return;
      }
      showToast("Profile saved.");
      router.refresh();
    });
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);

    const upload = await uploadAvatarFile(file);
    if ("error" in upload) {
      showToast(upload.error);
      setUploadingAvatar(false);
      return;
    }

    const save = await updateAvatarUrl(upload.publicUrl);
    if (!save.success) {
      showToast(save.error);
      setUploadingAvatar(false);
      return;
    }

    setAvatarUrl(upload.publicUrl);
    onAvatarChange(upload.publicUrl);
    showToast("Profile photo updated.");
    router.refresh();
    setUploadingAvatar(false);
    event.target.value = "";
  }

  return (
    <section id="profile" className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-text-primary">
          Profile
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Your personal account details across all workspaces.
        </p>
      </div>

      <div className="space-y-6 dashboard-panel p-6 md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UserAvatar
            name={fullName}
            email={email}
            avatarUrl={avatarUrl}
            size="lg"
          />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="btn-surface disabled:opacity-60"
            >
              {uploadingAvatar ? "Uploading…" : "Upload photo"}
            </button>
            <p className="mt-2 text-xs text-text-muted">
              JPG, PNG, or WebP. Max 5MB.
            </p>
          </div>
        </div>

        <AuthInput
          label="Full name"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Alex Morgan"
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Email address
          </label>
          <div className="surface-inset rounded-xl px-4 py-3 text-sm text-text-primary">
            {email}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            Email changes require verification. Confirmation links are sent to
            both your current and new addresses.
          </p>
          <button
            type="button"
            onClick={() => setEmailModalOpen(true)}
            className="mt-2 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Change email
          </button>
        </div>

        <div className="border-t border-[rgba(55,41,111,0.07)] pt-5">
          <button
            type="button"
            onClick={handleSaveName}
            disabled={!nameDirty || isSaving || uploadingAvatar}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(94, 80, 235,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <ChangeEmailModal
        open={emailModalOpen}
        currentEmail={email}
        onClose={() => setEmailModalOpen(false)}
        onSuccess={showToast}
        onError={showToast}
      />
    </section>
  );
}

function parseUserAgent(): string {
  if (typeof navigator === "undefined") return "This device";

  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android device";
  if (/Mac OS X/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux device";
  return "This browser";
}

export function SecuritySection() {
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, startPasswordTransition] = useTransition();
  const [isSigningOutOthers, startSignOutOthersTransition] = useTransition();

  function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    startPasswordTransition(async () => {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.success) {
        setPasswordError(result.error);
        showToast(result.error);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully.");
    });
  }

  function handleSignOutOthers() {
    startSignOutOthersTransition(async () => {
      const result = await signOutOtherSessions();
      if (!result.success) {
        showToast(result.error);
        return;
      }
      showToast("Signed out of all other sessions.");
    });
  }

  return (
    <section id="security" className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="font-display text-xl font-semibold text-text-primary">
          Security
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Password and session controls for your account.
        </p>
      </div>

      <div className="space-y-6">
        <form
          onSubmit={handlePasswordSubmit}
          className="dashboard-panel p-6 md:p-7"
        >
          <h3 className="text-sm font-semibold text-text-primary">
            Change password
          </h3>

          <div className="mt-4 space-y-4">
            <AuthInput
              label="Current password"
              name="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <AuthInput
              label="New password"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <AuthInput
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {passwordError && (
            <p className="mt-3 text-sm text-red-500">{passwordError}</p>
          )}

          <button
            type="submit"
            disabled={isChangingPassword}
            className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isChangingPassword ? "Updating…" : "Update password"}
          </button>
        </form>

        <div className="dashboard-panel p-6 md:p-7">
          <h3 className="text-sm font-semibold text-text-primary">
            Active sessions
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Supabase tracks active auth sessions per device. You can sign out
            everywhere except this browser.
          </p>

          <div className="surface-inset mt-4 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {parseUserAgent()}
                </p>
                <p className="text-xs text-text-muted">Active now · this session</p>
              </div>
              <span className="rounded-full bg-accent-secondary/10 px-2.5 py-1 text-[11px] font-semibold text-accent-secondary">
                Current
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOutOthers}
            disabled={isSigningOutOthers}
            className="btn-surface mt-4 disabled:opacity-60"
          >
            {isSigningOutOthers
              ? "Signing out other sessions…"
              : "Sign out all other sessions"}
          </button>
        </div>
      </div>
    </section>
  );
}
