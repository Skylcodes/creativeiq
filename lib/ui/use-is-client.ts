"use client";

import { useSyncExternalStore } from "react";

/** Hydration-safe client detection without setState in effects. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
