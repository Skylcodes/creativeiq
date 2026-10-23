import { NextResponse } from "next/server";
import {
  getAppOrigin,
  getInternalWorkerHeaders,
  getInternalWorkerOrigin,
} from "@/lib/internal-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Fake id — worker must 404 without creating or mutating an analysis. */
const PING_ANALYSIS_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Preview-only: trigger the real worker route on this deployment and report
 * which origin was used. Removed after preview evidence.
 */
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const workerOrigin = getInternalWorkerOrigin(request);
  const appOrigin = getAppOrigin(request);
  const headers = getInternalWorkerHeaders();
  const vercelDeploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? null;
  const vercelUrl = process.env.VERCEL_URL ?? null;
  const vercelEnv = process.env.VERCEL_ENV ?? null;

  if (!headers["x-internal-secret"]) {
    return NextResponse.json({
      ok: false,
      workerOrigin,
      appOrigin,
      vercelEnv,
      vercelUrl,
      vercelDeploymentId,
      error: "INTERNAL_API_SECRET is not set",
    });
  }

  const workerUrl = `${workerOrigin}/api/analyses/${PING_ANALYSIS_ID}/worker`;
  const res = await fetch(workerUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  const bodyText = await res.text();
  let workerBody: unknown = bodyText;
  try {
    workerBody = JSON.parse(bodyText);
  } catch {
    /* keep text — protection pages are HTML */
  }

  return NextResponse.json({
    ok: res.status === 404 && workerOrigin !== appOrigin,
    workerOrigin,
    appOrigin,
    vercelEnv,
    vercelUrl,
    vercelDeploymentId,
    workerUrl,
    workerStatus: res.status,
    workerBody,
  });
}
