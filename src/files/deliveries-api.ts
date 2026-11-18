import { apiRequest } from "@/api/client";

export type WorkspaceFileDelivery = {
  id: string;
  createdAt: string;
  sender: { id: string; name: string };
  recipient: { id: string; name: string; email: string };
  file: { id: string; name: string; mimeType: string; sizeBytes: string };
};

function deliveriesPath(workspaceId: string, suffix = ""): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/file-deliveries${suffix}`;
}

export function getWorkspaceFileDeliveries(workspaceId: string): Promise<WorkspaceFileDelivery[]> {
  return apiRequest<WorkspaceFileDelivery[]>(deliveriesPath(workspaceId));
}

export function getWorkspaceFileDeliveryDownloadPath(workspaceId: string, deliveryId: string): string {
  return deliveriesPath(workspaceId, `/${encodeURIComponent(deliveryId)}/download`);
}
