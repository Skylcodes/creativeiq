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
