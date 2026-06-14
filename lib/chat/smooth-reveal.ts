export type SmoothRevealOptions = {
  charsPerStep?: number;
  stepMs?: number;
  onStep?: (partial: string) => void;
  signal?: AbortSignal;
};

/**
 * Reveals text at a steady pace after the full response has been received.
 */
export function revealTextSmoothly(
  fullText: string,
  onReveal: (partial: string) => void,
  options: SmoothRevealOptions = {}
): Promise<void> {
  const { charsPerStep = 5, stepMs = 20, onStep, signal } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    let index = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort);

    const step = () => {
      if (signal?.aborted) {
        onAbort();
        return;
      }

      if (index >= fullText.length) {
        onReveal(fullText);
        onStep?.(fullText);
        cleanup();
        resolve();
        return;
      }

      index = Math.min(index + charsPerStep, fullText.length);
      const partial = fullText.slice(0, index);
      onReveal(partial);
      onStep?.(partial);
      timer = setTimeout(step, stepMs);
    };

    timer = setTimeout(step, stepMs);
  });
}
