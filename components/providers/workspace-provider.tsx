"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/lib/types/workspace";
import { setActiveWorkspace } from "@/lib/workspaces/actions";

type WorkspaceContextValue = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  switching: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

type WorkspaceProviderProps = {
  children: React.ReactNode;
  initialWorkspaces: Workspace[];
  initialActiveWorkspaceId: string | null;
};

export function WorkspaceProvider({
  children,
  initialWorkspaces,
  initialActiveWorkspaceId,
}: WorkspaceProviderProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    initialActiveWorkspaceId
  );
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setWorkspaces(initialWorkspaces);
      setActiveWorkspaceId(initialActiveWorkspaceId);
    });
  }, [initialWorkspaces, initialActiveWorkspaceId]);

  const activeWorkspace = useMemo(
    () =>
      workspaces.find((w) => w.id === activeWorkspaceId) ??
      workspaces[0] ??
      null,
    [workspaces, activeWorkspaceId]
  );

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (workspaceId === activeWorkspaceId) return;

      setSwitching(true);
      const result = await setActiveWorkspace(workspaceId);

      if (result.success) {
        setActiveWorkspaceId(workspaceId);
        router.refresh();
      }

      setSwitching(false);
    },
    [activeWorkspaceId, router]
  );

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, activeWorkspace, switching, switchWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
}
