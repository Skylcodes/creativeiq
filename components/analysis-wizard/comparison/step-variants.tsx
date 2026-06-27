"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MIN_SCRIPT_LENGTH } from "@/lib/analyses/constants";
import {
  validateImageFile,
  validateScriptContent,
  validateVideoFile,
} from "@/lib/analyses/validation";
import { createVideoThumbnail } from "@/lib/analyses/upload";
import type { CreativeTab } from "../types";
import type { VariantSlotState } from "./types";

const TABS: { id: CreativeTab; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "script", label: "Script" },
];

type StepVariantsProps = {
  variants: VariantSlotState[];
  onChange: (variants: VariantSlotState[]) => void;
};

function isSlotFilled(slot: VariantSlotState): boolean {
  if (slot.creativeTab === "image") return slot.creative.imageFile !== null;
  if (slot.creativeTab === "video") return slot.creative.videoFile !== null;
  return validateScriptContent(slot.creative.scriptContent) === null;
}

function VariantSlot({
  index,
  slot,
  lockedTab,
  onUpdate,
  onRemove,
  canRemove,
}: {
  index: number;
  slot: VariantSlotState;
  lockedTab: CreativeTab | null;
  onUpdate: (slot: VariantSlotState) => void;
  onRemove?: () => void;
  canRemove: boolean;
}) {
  const [fileError, setFileError] = useState<string | null>(null);
  const activeTab = lockedTab ?? slot.creativeTab;
  const defaultLabel = `Variant ${index + 1}`;

  const handleTabChange = (tab: CreativeTab) => {
    if (lockedTab) return;
    setFileError(null);
    onUpdate({ ...slot, creativeTab: tab });
  };

  const handleImage = (file: File) => {
    const err = validateImageFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    onUpdate({
      ...slot,
      creativeTab: "image",
      creative: {
        ...slot.creative,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
      },
    });
  };

  const handleVideo = async (file: File) => {
    const err = validateVideoFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    const thumbnail = await createVideoThumbnail(file);
    onUpdate({
      ...slot,
      creativeTab: "video",
      creative: {
        ...slot.creative,
        videoFile: file,
        videoPreview: URL.createObjectURL(file),
        videoThumbnail: thumbnail,
      },
    });
  };

  return (
    <div className="dashboard-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-text-muted">
            Variant name (optional)
          </label>
          <input
            type="text"
            value={slot.label}
            onChange={(e) => onUpdate({ ...slot, label: e.target.value })}
            placeholder={defaultLabel}
            className="input-field mt-1 w-full text-sm"
          />
        </div>
        {canRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-5 text-xs font-medium text-text-muted hover:text-[#ef4444]"
          >
            Remove
          </button>
        )}
      </div>

      {!lockedTab && (
        <div className="premium-tabs mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
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
      )}

      {activeTab === "image" && (
        <>
          {slot.creative.imagePreview ? (
            <div className="premium-card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slot.creative.imagePreview}
                alt=""
                className="max-h-40 w-full object-contain bg-black/[0.02]"
              />
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="truncate text-text-secondary">
                  {slot.creative.imageFile?.name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...slot,
                      creative: {
                        ...slot.creative,
                        imageFile: null,
                        imagePreview: null,
                      },
                    })
                  }
                  className="font-medium text-accent"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <label className="surface-inset flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 hover:border-accent/30">
              <input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImage(file);
                  e.target.value = "";
                }}
              />
              <p className="text-sm font-medium text-text-primary">
                Upload image
              </p>
              <p className="mt-1 text-xs text-text-muted">JPG or PNG</p>
            </label>
          )}
        </>
      )}

      {activeTab === "video" && (
        <>
          {slot.creative.videoFile ? (
            <div className="flex gap-3 rounded-xl bg-black/[0.02] p-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-[#1a1a2e]">
                {slot.creative.videoThumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slot.creative.videoThumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {slot.creative.videoFile.name}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...slot,
                      creative: {
                        ...slot.creative,
                        videoFile: null,
                        videoPreview: null,
                        videoThumbnail: null,
                      },
                    })
                  }
                  className="mt-2 text-xs font-medium text-accent"
                >
                  Replace
                </button>
              </div>
            </div>
          ) : (
            <label className="surface-inset flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 hover:border-accent/30">
              <input
                type="file"
                accept="video/mp4,.mp4"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleVideo(file);
                  e.target.value = "";
                }}
              />
              <p className="text-sm font-medium text-text-primary">
                Upload video
              </p>
              <p className="mt-1 text-xs text-text-muted">MP4 only</p>
            </label>
          )}
        </>
      )}

      {activeTab === "script" && (
        <>
          <textarea
            value={slot.creative.scriptContent}
            onChange={(e) =>
              onUpdate({
                ...slot,
                creativeTab: "script",
                creative: { ...slot.creative, scriptContent: e.target.value },
              })
            }
            placeholder="Paste this variant's script or copy..."
            rows={6}
            className="input-field text-sm leading-relaxed"
          />
          <p className="mt-1 text-xs text-text-muted">
            {slot.creative.scriptContent.trim().length} / {MIN_SCRIPT_LENGTH}{" "}
            min characters
          </p>
        </>
      )}

      {fileError && (
        <p className="mt-2 text-sm text-[#ef4444]" role="alert">
          {fileError}
        </p>
      )}
    </div>
  );
}

export function StepVariants({ variants, onChange }: StepVariantsProps) {
  const filledSlots = variants.filter(isSlotFilled);
  const lockedTab = filledSlots.length > 0 ? filledSlots[0].creativeTab : null;

  const typeMismatch =
    lockedTab && filledSlots.some((s) => s.creativeTab !== lockedTab);

  const updateVariant = (index: number, slot: VariantSlotState) => {
    const next = [...variants];
    next[index] = slot;
    onChange(next);
  };

  const addVariant = () => {
    if (variants.length >= 4) return;
    onChange([
      ...variants,
      {
        label: "",
        creativeTab: lockedTab ?? "image",
        creative: {
          imageFile: null,
          imagePreview: null,
          videoFile: null,
          videoPreview: null,
          videoThumbnail: null,
          scriptContent: "",
        },
      },
    ]);
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
        Upload your variants
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        Add 2 to 4 versions of the same creative type. All variants must be
        image, video, or script — you cannot mix types in one comparison.
      </p>

      {lockedTab && (
        <p className="mt-4 rounded-xl bg-accent/[0.06] px-4 py-2.5 text-xs font-medium text-accent">
          All variants locked to{" "}
          {lockedTab === "image"
            ? "static image"
            : lockedTab === "video"
              ? "video"
              : "script"}{" "}
          uploads
        </p>
      )}

      {typeMismatch && (
        <p
          className="mt-3 rounded-xl bg-[#ef4444]/8 px-4 py-2.5 text-sm text-[#ef4444]"
          role="alert"
        >
          All variants must use the same creative type. Remove mismatched
          uploads or start over with one format.
        </p>
      )}

      <div className="mt-6 space-y-4">
        <AnimatePresence initial={false}>
          {variants.map((slot, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <VariantSlot
                index={index}
                slot={slot}
                lockedTab={lockedTab}
                onUpdate={(s) => updateVariant(index, s)}
                onRemove={() =>
                  onChange(variants.filter((_, i) => i !== index))
                }
                canRemove={index >= 2}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {variants.length < 4 && (
        <button
          type="button"
          onClick={addVariant}
          className="surface-inset mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 text-sm font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Add a {variants.length === 2 ? "third" : "fourth"} variant
        </button>
      )}
    </div>
  );
}

export function areVariantsValid(variants: VariantSlotState[]): boolean {
  if (variants.length < 2) return false;
  const filled = variants.filter(isSlotFilled);
  if (filled.length < 2) return false;
  const tab = filled[0].creativeTab;
  return filled.every((v) => v.creativeTab === tab && isSlotFilled(v));
}

export function getLockedCreativeType(
  variants: VariantSlotState[],
): "image" | "video" | "script" | null {
  const filled = variants.filter(isSlotFilled);
  return filled.length > 0 ? filled[0].creativeTab : null;
}
