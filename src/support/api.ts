import { apiRequest } from "@/api/client";

export type SupportTicket = {
  id: string;
  subject: string;
  category: "ACCOUNT" | "BILLING" | "TECHNICAL" | "WORKSPACE" | "OTHER" | string;
  priority: string;
  status: "OPEN" | "WAITING_CUSTOMER" | "WAITING_SUPPORT" | "RESOLVED" | string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  messages?: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; name: string; role: string };
  }>;
};

export function getSupportTickets(): Promise<SupportTicket[]> {
  return apiRequest<SupportTicket[]>("/support/tickets");
}

export function getSupportTicket(ticketId: string): Promise<SupportTicket> {
  return apiRequest<SupportTicket>(`/support/tickets/${encodeURIComponent(ticketId)}`);
}

export function createSupportTicket(input: {
  subject: string;
  category: string;
  body: string;
}): Promise<SupportTicket> {
  return apiRequest<SupportTicket>("/support/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function replyToSupportTicket(ticketId: string, body: string): Promise<{ id: string; body: string; createdAt: string }> {
  return apiRequest<{ id: string; body: string; createdAt: string }>(
    `/support/tickets/${encodeURIComponent(ticketId)}/messages`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}
