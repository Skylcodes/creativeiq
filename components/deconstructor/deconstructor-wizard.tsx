"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createDeconstruction } from "@/lib/deconstructions/actions";
import { useBilling } from "@/components/billing/billing-provider";
import {
  uploadCreativeFile,
  uploadVideoThumbnail,
  createVideoThumbnail,
} from "@/lib/analyses/upload";
import {
  validateImageFile,
  validateLandingPageUrl,
  validateVideoFile,
} from "@/lib/analyses/validation";
import type { DeconstructionInput } from "@/lib/types/deconstruction";
import type { Workspace } from "@/lib/types/workspace";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { DeconstructionProgress } from "./deconstruction-progress";

type DeconstructorWizardProps = {
  workspace: Workspace;
};

type CreativeTab = "image" | "video";

type WizardPhase = "wizard" | "progress";

export function DeconstructorWizard({ workspace }: DeconstructorWizardProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<WizardPhase>("wizard");
  const [landingPageUrl, setLandingPageUrl] = useState("");
  const [landingError, setLandingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CreativeTab>("image");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deconstructionId, setDeconstructionId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { ensureCanAct, showBlocked } = useBilling();

  const handleFile = useCallback(
    (next: File) => {
      const err =
        activeTab === "image"
          ? validateImageFile(next)
          : validateVideoFile(next);
      if (err) {
        setFileError(err);
        return;
      }
      setFileError(null);
      setFile(next);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (activeTab === "image") {
        setPreviewUrl(URL.createObjectURL(next));
      } else {
        setPreviewUrl(null);
      }
    },
    [activeTab, previewUrl],
  );

  const canSubmit =
    validateLandingPageUrl(landingPageUrl) === null &&
    Boolean(file) &&
    !isSubmitting;

  const handleSubmit = async () => {
    const lpErr = validateLandingPageUrl(landingPageUrl);
    if (lpErr) {
      setLandingError(lpErr);
      return;
    }
    if (!file) {
      setFileError("Upload the ad creative.");
      return;
    }
    if (!ensureCanAct("ad_deconstructions")) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const upload = await uploadCreativeFile(file, activeTab);
      if ("error" in upload) {
        setSubmitError(upload.error);
        setIsSubmitting(false);
        return;
      }

      const input: DeconstructionInput = {
        landingPageUrl: landingPageUrl.trim(),
        creativeType: activeTab,
        creativeStoragePath: upload.path,
        creativeMimeType: file.type,
        creativeFileName: file.name,
      };

      if (activeTab === "video") {
        const thumb = await createVideoThumbnail(file);
        if (thumb) {
          const thumbUp = await uploadVideoThumbnail(thumb);
          if (!("error" in thumbUp)) input.thumbnailUrl = thumbUp.url;
        }
      }

      const result = await createDeconstruction({
        workspaceId: workspace.id,
        input,
      });

      if (!result.success) {
        if (result.blocked) showBlocked(result.blocked);
        setSubmitError(result.error);
        setIsSubmitting(false);
        return;
      }

      setDeconstructionId(result.deconstruction.id);
      setPhase("progress");

      await fetch(`/api/deconstructions/${result.deconstruction.id}/run`, {
        method: "POST",
      });
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === "progress" && deconstructionId) {
    return (
      <DeconstructionProgress
        deconstructionId={deconstructionId}
        onComplete={() => router.replace(`/deconstructor/${deconstructionId}`)}
        onRetry={() => {
          setPhase("wizard");
          setDeconstructionId(null);
        }}
      />
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Winning Ad Deconstructor"
        description="Paste the competitor's product landing page and upload their ad. We verify evidence first, then break down why it works — and translate the strategy to your brand."
      />

      <div className="mx-auto max-w-xl space-y-8">
        <div>
          <label
            htmlFor="landing-page"
            className="block text-sm font-semibold text-text-primary"
          >
            Product landing page URL
          </label>
          <p className="mt-1 text-xs text-text-secondary">
            The competitor&apos;s product page — used to identify the brand and
            verify performance signals.
          </p>
          <input
            id="landing-page"
            type="url"
            value={landingPageUrl}
            onChange={(e) => {
              setLandingPageUrl(e.target.value);
              setLandingError(null);
            }}
            onBlur={() =>
              setLandingError(validateLandingPageUrl(landingPageUrl))
            }
            placeholder="https://competitor.com/products/..."
            className="input-field mt-3"
          />
          {landingError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {landingError}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-text-primary">Ad creative</p>
          <p className="mt-1 text-xs text-text-secondary">
            Screenshot or video of the ad you want deconstructed.
          </p>

          <div className="premium-tabs dashboard-panel mt-3">
            {(["image", "video"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setFile(null);
                  setFileError(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className={`premium-tab relative flex-1 ${
                  activeTab === tab ? "premium-tab-active text-accent" : ""
                }`}
              >
                {activeTab === tab && (
                  <div className="premium-tab-indicator" />
                )}
                <span className="relative">
                  {tab === "image" ? "Image" : "Video"}
                </span>
              </button>
            ))}
          </div>

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) handleFile(dropped);
            }}
            className={`relative mt-3 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
              dragging
                ? "border-accent bg-accent/[0.04]"
                : file
                  ? "border-accent/40 bg-accent/[0.02]"
                  : "premium-card-glass surface-inset hover:border-accent/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={
                activeTab === "image" ? "image/jpeg,image/png" : "video/mp4"
              }
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />

            {previewUrl && activeTab === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="max-h-48 rounded-lg object-contain"
              />
            ) : file ? (
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-text-muted">Click to replace</p>
              </div>
            ) : (
              <>
                <div className="icon-badge mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M12 5V19M5 12H19"
                      stroke="#6947ff"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-text-primary">
                  Drag & drop or click to upload
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {activeTab === "image" ? "JPG or PNG" : "MP4 video"}
                </p>
              </>
            )}
          </div>

          {fileError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {fileError}
            </p>
          )}
        </div>

        {submitError && (
          <p className="text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="btn-premium w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Starting…" : "Deconstruct ad"}
        </button>

        <p className="text-center text-xs text-text-muted">
          We verify performance evidence before deconstructing. Unverified
          uploads receive an honest analysis instead of a &quot;winning ad&quot;
          teardown.
        </p>
      </div>
    </PageShell>
  );
}
