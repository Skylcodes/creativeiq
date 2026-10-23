export class CallTimeoutError extends Error {
  override name = "TimeoutError";
  constructor(message = "Request timed out.") {
    super(message);
  }
}

/** Rejects (does not degrade) when `ms` elapses. */
export async function withTimeoutReject<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new CallTimeoutError()), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: () => T
): Promise<T> {
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      if (!settled) resolve(fallback());
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeout]);
    settled = true;
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
