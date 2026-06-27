"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MIN_SCRIPT_LENGTH } from "@/lib/analyses/constants";
import {
  validateImageFile,
  validateScriptContent,
  validateVideoFile,
} from "@/lib/analyses/validation";
import { createVideoThumbnail } from "@/lib/analyses/upload";
import { BrowseHooksModal } from "@/components/hooks/browse-hooks-modal";
import type { HookLibraryEntry } from "@/lib/types/hook";
import type { CreativeTab, WizardCreativeState } from "./types";

const TABS: { id: CreativeTab; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "script", label: "Script" },
];

type StepCreativeProps = {
  activeTab: CreativeTab;
  creative: WizardCreativeState;
  onTabChange: (tab: CreativeTab) => void;
  onCreativeChange: (creative: WizardCreativeState) => void;
  libraryHooks?: HookLibraryEntry[];
};

function DropZone({
  accept,
  hint,
  onFile,
  error,
  children,
}: {
  accept: string;
  hint: string;
  onFile: (file: File) => void;
  error?: string | null;
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      onFile(file);
    },
    [onFile],
  );

  return (
    <div>
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
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 ${
          dragging
            ? "border-accent bg-accent/[0.04] scale-[1.01]"
            : "surface-inset hover:border-accent/30 hover:bg-accent/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {children ?? (
          <>
            <div className="icon-badge mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/8">
              <svg
                width="24"
                height="24"
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
            <p className="mt-1 text-xs text-text-muted">{hint}</p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-[#ef4444]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function StepCreative({
  activeTab,
  creative,
  onTabChange,
  onCreativeChange,
  libraryHooks = [],
}: StepCreativeProps) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);

  const handleImage = (file: File) => {
    const err = validateImageFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    const preview = URL.createObjectURL(file);
    onCreativeChange({
      ...creative,
      imageFile: file,
      imagePreview: preview,
    });
  };

  const handleVideo = async (file: File) => {
    const err = validateVideoFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    const preview = URL.createObjectURL(file);
    const thumbnail = await createVideoThumbnail(file);
    onCreativeChange({
      ...creative,
      videoFile: file,
      videoPreview: preview,
      videoThumbnail: thumbnail,
    });
  };

  const scriptLength = creative.scriptContent.trim().length;

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
        Upload your ad creative
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        Share the exact creative you plan to run. Our agents analyze hooks,
        visuals, and copy against your landing page.
      </p>

      <div className="premium-tabs mt-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setFileError(null);
              onTabChange(tab.id);
            }}
            className={`premium-tab relative flex-1 ${
              activeTab === tab.id ? "premium-tab-active" : ""
            }`}
          >
            {activeTab === tab.id && (
              <div className="premium-tab-indicator" />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {activeTab === "image" && (
            <motion.div
              key="image"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {creative.imagePreview ? (
                <div className="premium-card overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={creative.imagePreview}
                    alt="Uploaded creative preview"
                    className="max-h-[320px] w-full object-contain bg-black/[0.02]"
                  />
                  <div className="surface-inset flex items-center justify-between border-t-0 px-4 py-3">
                    <span className="truncate text-sm text-text-secondary">
                      {creative.imageFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onCreativeChange({
                          ...creative,
                          imageFile: null,
                          imagePreview: null,
                        })
                      }
                      className="text-sm font-medium text-accent hover:text-accent-hover"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              ) : (
                <DropZone
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  hint="JPG or PNG · Max 50MB"
                  onFile={handleImage}
                  error={fileError}
                />
              )}
            </motion.div>
          )}

          {activeTab === "video" && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {creative.videoFile ? (
                <div className="premium-card overflow-hidden">
                  <div className="flex gap-4 bg-black/[0.02] p-4">
                    <div className="h-24 w-40 shrink-0 overflow-hidden rounded-xl bg-[#1a1a2e]">
                      {creative.videoThumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={creative.videoThumbnail}
                          alt="Video thumbnail"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="white"
                            fillOpacity="0.7"
                            aria-hidden
                          >
                            <path d="M8 5V19L19 12L8 5Z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="truncate font-medium text-text-primary">
                        {creative.videoFile.name}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {(creative.videoFile.size / (1024 * 1024)).toFixed(1)}{" "}
                        MB · MP4
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          onCreativeChange({
                            ...creative,
                            videoFile: null,
                            videoPreview: null,
                            videoThumbnail: null,
                          })
                        }
                        className="mt-3 text-sm font-medium text-accent hover:text-accent-hover"
                      >
                        Replace video
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <DropZone
                  accept="video/mp4,.mp4"
                  hint="MP4 only · Max 500MB"
                  onFile={handleVideo}
                  error={fileError}
                />
              )}
            </motion.div>
          )}

          {activeTab === "script" && (
            <motion.div
              key="script"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <textarea
                value={creative.scriptContent}
                onChange={(e) =>
                  onCreativeChange({
                    ...creative,
                    scriptContent: e.target.value,
                  })
                }
                placeholder="Paste your ad script, voiceover copy, or primary ad text here..."
                rows={10}
                className="input-field text-sm leading-relaxed"
              />
              {libraryHooks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBrowseOpen(true)}
                  className="mt-2 text-sm font-semibold text-accent hover:underline"
                >
                  Browse hook library
                </button>
              )}
              <BrowseHooksModal
                hooks={libraryHooks}
                open={browseOpen}
                onClose={() => setBrowseOpen(false)}
                onSelect={(hookText) => {
                  const prefix = creative.scriptContent.trim()
                    ? `${creative.scriptContent.trim()}\n\n`
                    : "";
                  onCreativeChange({
                    ...creative,
                    scriptContent: `${prefix}${hookText}`,
                  });
                }}
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span
                  className={
                    scriptLength > 0 && scriptLength < MIN_SCRIPT_LENGTH
                      ? "text-[#f59e0b]"
                      : "text-text-muted"
                  }
                >
                  {validateScriptContent(creative.scriptContent) &&
                  scriptLength > 0
                    ? `Minimum ${MIN_SCRIPT_LENGTH} characters required`
                    : "Include hook, body, and CTA for best results"}
                </span>
                <span
                  className={`font-medium ${
                    scriptLength >= MIN_SCRIPT_LENGTH
                      ? "text-accent-secondary"
                      : "text-text-muted"
                  }`}
                >
                  {scriptLength} characters
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function isCreativeStepValid(
  tab: CreativeTab,
  creative: WizardCreativeState,
): boolean {
  if (tab === "image") return creative.imageFile !== null;
  if (tab === "video") return creative.videoFile !== null;
  return validateScriptContent(creative.scriptContent) === null;
}
