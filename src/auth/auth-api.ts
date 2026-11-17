import { apiRequest } from "@/api/client";
import { persistSessionFromNativeCookieJar } from "@/auth/session";

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role?: "USER" | "ADMIN";
}

export interface AuthResult {
  user: User;
  workspaceId: string | null;
}

export interface RegistrationResult {
  emailVerified: boolean;
  workspaceId?: string;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const result = await apiRequest<AuthResult>("/auth/login", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  await persistSessionFromNativeCookieJar();
  return result;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  accountType: "PERSONAL" | "BUSINESS";
  workspaceName?: string;
  referralCode?: string;
}): Promise<RegistrationResult> {
  return apiRequest<RegistrationResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifyEmailCode(email: string, code: string): Promise<AuthResult> {
  const result = await apiRequest<AuthResult>("/auth/verify-email-code", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ email, code }),
  });
  await persistSessionFromNativeCookieJar();
  return result;
}

export async function resendVerification(email: string): Promise<void> {
  await apiRequest<void>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest<void>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email: string, code: string, password: string): Promise<void> {
  await apiRequest<void>("/auth/reset-password-code", {
    method: "POST",
    body: JSON.stringify({ email, code, password }),
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/auth/me");
}

export async function signOut(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}
