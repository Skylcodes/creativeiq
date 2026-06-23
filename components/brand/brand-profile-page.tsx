"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrandProfileFormSections } from "@/components/brand/brand-profile-form";
import {
  RefreshConfirmModal,
  UnsavedChangesModal,
} from "@/components/brand/brand-profile-modals";
import { RefreshProgressBanner } from "@/components/brand/refresh-progress-banner";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useToast } from "@/components/shared/toast";
import { normalizeLegacyProfile } from "@/lib/brand-profile/normalize";
import {
  createEmptyBrandProfileForm,
  formatBrandProfileUpdatedAt,
  formsEqual,
  profileToForm,
  type BrandProfileForm,
} from "@/lib/brand-profile/form";
import { saveBrandProfile } from "@/lib/workspaces/brand-profile-actions";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import type {
  BrandProfile,
  BrandProfileProgress,
  BrandProfileStatus,
} from "@/lib/types/report";

const POLL_INTERVAL_MS = 2000;

type BrandProfilePageProps = {
  workspaceId: string;
  workspaceName: string;
  websiteUrl: string;
  profile: BrandProfile | null;
  updatedAt: string | null;
};

export function BrandProfilePage({
  workspaceId,
  workspaceName,
  websiteUrl,
  profile,
  updatedAt,
}: BrandProfilePageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { activeWorkspace, switching } = useWorkspace();

  const initialForm = profile
    ? profileToForm(normalizeLegacyProfile(profile), workspaceName, websiteUrl)
    : createEmptyBrandProfileForm(workspaceName, websiteUrl);

  const [form, setForm] = useState<BrandProfileForm>(initialForm);
  const [savedForm, setSavedForm] = useState<BrandProfileForm>(initialForm);
  const [lastUpdated, setLastUpdated] = useState(updatedAt);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(
    "Crawling your website…",
  );
  const [refreshProgress, setRefreshProgress] = useState(8);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const isDirty = !formsEqual(form, savedForm);

  useEffect(() => {
    const nextInitial = profile
      ? profileToForm(
          normalizeLegacyProfile(profile),
          workspaceName,
          websiteUrl,
        )
      : createEmptyBrandProfileForm(workspaceName, websiteUrl);
    queueMicrotask(() => {
      setForm(nextInitial);
      setSavedForm(nextInitial);
      setLastUpdated(updatedAt);
      setFieldErrors({});
      setRefreshError(null);
      setRefreshing(false);
    });
  }, [workspaceId, workspaceName, websiteUrl, profile, updatedAt]);

  useEffect(() => {
    if (!activeWorkspace || activeWorkspace.id === workspaceId) return;
    if (isDirty) {
      queueMicrotask(() => setUnsavedOpen(true));
      return;
    }
    router.replace("/brand");
    router.refresh();
  }, [activeWorkspace, workspaceId, isDirty, router]);

  useEffect(() => {
    if (!isDirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    function onClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor || anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("/brand")) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
      setUnsavedOpen(true);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty]);

  useEffect(() => {
    if (!refreshing) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/brand-profile/status`,
        );
        if (!res.ok) throw new Error("Could not check refresh status.");

        const data = (await res.json()) as {
          status: BrandProfileStatus;
          progress: BrandProfileProgress | null;
          error: string | null;
          profile: BrandProfile | null;
          updatedAt: string | null;
        };

        if (cancelled) return;

        if (data.progress?.message) {
          setRefreshMessage(data.progress.message);
          setRefreshProgress(Math.max(data.progress.percent, 8));
        }

        if (data.status === "complete" && data.profile) {
          const normalized = normalizeLegacyProfile(data.profile);
          const nextForm = profileToForm(
            normalized,
            normalized.brandName,
            normalized.url,
          );
          setForm(nextForm);
          setSavedForm(nextForm);
          setLastUpdated(data.updatedAt);
          setRefreshing(false);
          setRefreshError(null);
          showToast("Brand profile refreshed from your website.");
          router.refresh();
          return;
        }

        if (data.status === "manual_required" || data.status === "failed") {
          setRefreshing(false);
          setRefreshError(
            data.error ??
              "We couldn't refresh your brand profile. Your existing profile is unchanged.",
          );
          return;
        }
      } catch {
        if (!cancelled) {
          setRefreshMessage("Still working on your brand profile…");
        }
      }

      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [refreshing, workspaceId, router, showToast]);

  function handleSave(onSuccess?: () => void) {
    startSaveTransition(async () => {
      const result = await saveBrandProfile(workspaceId, form);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        showToast(result.error);
        return;
      }

      const nextForm = profileToForm(
        normalizeLegacyProfile(result.profile),
        result.workspaceName,
        result.websiteUrl,
      );

      setForm(nextForm);
      setSavedForm(nextForm);
      setLastUpdated(result.updatedAt);
      setFieldErrors({});
      showToast("Brand profile saved.");
      router.refresh();
      onSuccess?.();
    });
  }

  function startRefresh() {
    setRefreshOpen(false);
    setRefreshing(true);
    setRefreshError(null);
    setRefreshMessage("Crawling your website…");
    setRefreshProgress(10);

    void (async () => {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/brand-profile/refresh`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ websiteUrl: form.websiteUrl }),
          },
        );

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Refresh failed.");
        }
      } catch (err) {
        setRefreshing(false);
        setRefreshError(
          err instanceof Error
            ? err.message
            : "Refresh failed. Your existing profile is unchanged.",
        );
      }
    })();
  }

  function handleRefreshClick() {
    setRefreshOpen(true);
  }

  function handleDiscardNavigation() {
    setUnsavedOpen(false);
    if (pendingHref) {
      router.push(pendingHref);
      setPendingHref(null);
      return;
    }
    router.replace("/brand");
    router.refresh();
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={workspaceName}
        title="Brand Profile"
        description={`Last updated ${formatBrandProfileUpdatedAt(lastUpdated)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={refreshing || isSaving || switching}
              className="btn-ghost gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M13.5 8C13.5 11 11 13.5 8 13.5C5.3 13.5 3.1 11.5 2.6 9M2.5 8C2.5 5 5 2.5 8 2.5C10.5 2.5 12.6 4.3 13.2 6.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <path
                  d="M12.5 3.5V6.5H9.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Refresh from website
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={!isDirty || isSaving || refreshing || switching}
              className="btn-premium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        }
      />

      <PremiumCard variant="accent" padding="sm" className="mt-2">
        <p className="text-sm leading-relaxed text-text-secondary">
          <span className="font-medium text-text-primary">
            Your brand profile is the foundation of every analysis.
          </span>{" "}
          Keep it accurate for the best results.
        </p>
      </PremiumCard>

      {(refreshing || refreshError) && (
        <div className="mt-5">
          <RefreshProgressBanner
            message={refreshMessage}
            progress={refreshProgress}
            error={refreshError}
          />
        </div>
      )}

      <div
        className={`mt-6 space-y-5 transition-opacity duration-200 ${
          refreshing || switching
            ? "pointer-events-none opacity-60"
            : "opacity-100"
        }`}
      >
        <BrandProfileFormSections
          form={form}
          onChange={setForm}
          fieldErrors={fieldErrors}
          disabled={refreshing || isSaving}
        />
      </div>

      <RefreshConfirmModal
        open={refreshOpen}
        onConfirm={startRefresh}
        onCancel={() => setRefreshOpen(false)}
      />

      <UnsavedChangesModal
        open={unsavedOpen}
        saving={isSaving}
        onCancel={() => {
          setUnsavedOpen(false);
          setPendingHref(null);
        }}
        onDiscard={handleDiscardNavigation}
        onSave={() =>
          handleSave(() => {
            setUnsavedOpen(false);
            if (pendingHref) {
              router.push(pendingHref);
              setPendingHref(null);
            }
          })
        }
      />
    </PageShell>
  );
}
