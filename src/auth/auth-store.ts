import { create } from "zustand";

import { ApiError } from "@/api/client";
import { getCurrentUser, type AuthResult, type User } from "@/auth/auth-api";
import { clearStoredSession, hasStoredSession } from "@/auth/session";

type AuthStatus = "checking" | "signedOut" | "signedIn" | "error";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  workspaceId: string | null;
  error: string | null;
  initialize: () => Promise<void>;
  setAuthenticated: (result: AuthResult) => void;
  clearAuthentication: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "checking",
  user: null,
  workspaceId: null,
  error: null,
  initialize: async () => {
    set({ status: "checking", error: null });
    try {
      if (!(await hasStoredSession())) {
        set({ status: "signedOut", user: null, workspaceId: null });
        return;
      }

      const user = await getCurrentUser();
      set({ status: "signedIn", user, workspaceId: null, error: null });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        try {
          await clearStoredSession();
          set({ status: "signedOut", user: null, workspaceId: null, error: null });
        } catch (cleanupError) {
          set({
            status: "error",
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : "We couldn’t clear the expired IMARA session.",
          });
        }
        return;
      }

      set({
        status: "error",
        error: error instanceof Error ? error.message : "Unable to check your IMARA session.",
      });
    }
  },
  setAuthenticated: (result) => {
    set({
      status: "signedIn",
      user: result.user,
      workspaceId: result.workspaceId,
      error: null,
    });
  },
  clearAuthentication: async () => {
    try {
      await clearStoredSession();
    } finally {
      set({ status: "signedOut", user: null, workspaceId: null, error: null });
    }
  },
}));
