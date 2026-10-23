/** Observability only — does not change inputs, prompts, or outputs. */
export async function logWorkerStage<T>(
  stage: string,
  fn: () => Promise<T>
): Promise<T> {
  const started = Date.now();
  console.log(`[worker] stage ${stage} start`);
  try {
    const result = await fn();
    console.log(`[worker] stage ${stage} ${Date.now() - started}ms`);
    return result;
  } catch (err) {
    console.log(
      `[worker] stage ${stage} ${Date.now() - started}ms error:`,
      err instanceof Error ? err.message : err
    );
    throw err;
  }
}
