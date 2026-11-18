import { apiRequest } from "@/api/client";

export type Profile = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "USER" | "ADMIN";
  accountStatus?: string;
};

export type DashboardSummary = {
  storageUsedBytes?: string;
  storageLimitBytes?: string;
  fileCount?: number;
  folderCount?: number;
  recentFiles?: Array<{ id: string; name: string; mimeType: string; createdAt: string }>;
  recentFolders?: Array<{ id: string; name: string; createdAt: string }>;
  [key: string]: unknown;
};

export type SessionItem = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type Subscription = {
  plan: "FREE" | "PRO" | "BUSINESS";
  status?: string;
  storageLimitBytes?: string;
  [key: string]: unknown;
};

export type PaymentAttempt = {
  id: string;
  checkoutId: string;
  plan: "PRO" | "BUSINESS";
  amountMinor: number;
  currency: string;
  status: string;
  providerStatus: string | null;
  createdAt: string;
  completedAt: string | null;
};

export function getProfile(): Promise<Profile> {
  return apiRequest<Profile>("/users/me");
}

export function updateProfile(name: string): Promise<Profile> {
  return apiRequest<Profile>("/users/me", { method: "PATCH", body: JSON.stringify({ name }) });
}

export function getDashboard(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/dashboard/summary");
}

export function getSubscription(): Promise<Subscription> {
  return apiRequest<Subscription>("/subscription");
}

export function getPlans(): Promise<unknown[]> {
  return apiRequest<unknown[]>("/plans");
}

export function getSessions(): Promise<SessionItem[]> {
  return apiRequest<SessionItem[]>("/auth/sessions");
}

export function revokeSession(sessionId: string): Promise<void> {
  return apiRequest<void>(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiRequest<void>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function createCheckout(plan: "PRO" | "BUSINESS"): Promise<{ checkoutUrl: string; checkoutId: string }> {
  return apiRequest<{ checkoutUrl: string; checkoutId: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export function getPayments(): Promise<PaymentAttempt[]> {
  return apiRequest<PaymentAttempt[]>("/billing/payments");
}

export function getPayment(checkoutId: string): Promise<PaymentAttempt> {
  return apiRequest<PaymentAttempt>(`/billing/payments/${encodeURIComponent(checkoutId)}`);
}
