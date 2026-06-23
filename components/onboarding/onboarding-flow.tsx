"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { completeOnboarding, createWorkspace } from "@/lib/workspaces/actions";
import type { Workspace } from "@/lib/types/workspace";
import { OnboardingShell } from "./onboarding-shell";
import { StepCreateWorkspace } from "./step-create-workspace";
import { StepLoading } from "./step-loading";
import { StepManualBrand } from "./step-manual-brand";
import { StepReady } from "./step-ready";
import { StepWelcome } from "./step-welcome";

type OnboardingStep = "welcome" | "create" | "loading" | "manual" | "ready";
type OnboardingMode = "full" | "new";

type OnboardingFlowProps = {
  mode?: OnboardingMode;
};

function getDisplayName(
  fullName: string | undefined,
  email: string | undefined
): string {
  if (fullName?.trim()) {
    return fullName.split(" ")[0];
  }
  if (email) {
    return email.split("@")[0];
  }
  return "there";
}

export function OnboardingFlow({ mode = "full" }: OnboardingFlowProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<OnboardingStep>(
    mode === "new" ? "create" : "welcome"
  );
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const totalSteps = mode === "new" ? 2 : 4;

  const stepNumber =
    step === "welcome"
      ? 1
      : step === "create"
        ? mode === "new"
          ? 1
          : 2
        : step === "loading" || step === "manual"
          ? mode === "new"
            ? 2
            : 3
          : 4;

  const handleCreateSubmit = useCallback(
    async (name: string, brandUrl: string) => {
      return createWorkspace(name, brandUrl, {
        skipOnboarding: mode === "new",
      });
    },
    [mode]
  );

  const handleCreateSuccess = useCallback((created: Workspace) => {
    setWorkspace(created);
    setManualError(null);
    setStep("loading");
  }, []);

  const finishOnboarding = useCallback(async () => {
    if (mode === "full") {
      await completeOnboarding();
    }

    if (mode === "new") {
      router.push("/dashboard");
      router.refresh();
    } else {
      setStep("ready");
    }
  }, [mode, router]);

  const handleLoadingComplete = useCallback(() => {
    void finishOnboarding();
  }, [finishOnboarding]);

  const handleManualRequired = useCallback((errorMessage: string | null) => {
    setManualError(errorMessage);
    setStep("manual");
  }, []);

  const handleManualComplete = useCallback(() => {
    void finishOnboarding();
  }, [finishOnboarding]);

  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
    router.refresh();
  }, [router]);

  const userName = getDisplayName(
    user?.user_metadata?.full_name as string | undefined,
    user?.email
  );

  return (
    <OnboardingShell
      step={stepNumber}
      totalSteps={totalSteps}
      wide={step === "create" || step === "manual"}
    >
      {step === "welcome" && (
        <StepWelcome
          userName={userName}
          onContinue={() => setStep("create")}
        />
      )}

      {step === "create" && (
        <StepCreateWorkspace
          title={
            mode === "new"
              ? "Add a new workspace"
              : "Create your first workspace"
          }
          subtitle="Advara will crawl your website to understand your product, positioning, and target customer."
          submitLabel={mode === "new" ? "Add workspace" : "Create workspace"}
          onSubmit={handleCreateSubmit}
          onSuccess={handleCreateSuccess}
        />
      )}

      {step === "loading" && workspace && (
        <StepLoading
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          onComplete={handleLoadingComplete}
          onManualRequired={handleManualRequired}
        />
      )}

      {step === "manual" && workspace && (
        <StepManualBrand
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          errorMessage={manualError}
          onComplete={handleManualComplete}
        />
      )}

      {step === "ready" && workspace && (
        <StepReady
          workspaceName={workspace.name}
          onContinue={handleGoToDashboard}
        />
      )}
    </OnboardingShell>
  );
}
