import { apiRequest } from "@/api/client";

export interface NotificationItem {
  id: string;
  workspaceId?: string | null;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  audience: string;
  readAt: string | null;
  createdAt: string;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  role: string;
}

export interface ChatConversation {
  id: string;
  workspaceId: string;
  type: "WORKSPACE" | "DIRECT";
  lastMessage: {
    id: string;
    senderName: string;
    content: string;
    createdAt: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

interface ChatMessagePage {
  messages: ChatMessage[];
  nextAfterId: string | null;
  nextBeforeId: string | null;
}

export function getNotifications(): Promise<NotificationItem[]> {
  return apiRequest<NotificationItem[]>("/notifications");
}

export async function getAllNotifications(): Promise<NotificationItem[]> {
  const [personal, workspaces] = await Promise.all([getNotifications(), getWorkspaces()]);
  const workspaceNotifications = await Promise.all(
    workspaces.map(async (workspace) => {
      const items = await apiRequest<NotificationItem[]>(
        `/workspaces/${encodeURIComponent(workspace.id)}/notifications`,
      );
      return items.map((item) => ({ ...item, workspaceId: workspace.id }));
    }),
  );
  return [...personal, ...workspaceNotifications.flat()].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

export function markNotificationRead(notificationId: string): Promise<{ id: string; read: true }> {
  return apiRequest<{ id: string; read: true }>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
  });
}

export function markWorkspaceNotificationRead(
  workspaceId: string,
  notificationId: string,
): Promise<{ id: string; read: true }> {
  return apiRequest<{ id: string; read: true }>(
    `/workspaces/${encodeURIComponent(workspaceId)}/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "POST" },
  );
}

export function getAnnouncements(): Promise<AnnouncementItem[]> {
  return apiRequest<AnnouncementItem[]>("/announcements");
}

export function markAnnouncementRead(announcementId: string): Promise<{ id: string; readAt: string | null }> {
  return apiRequest<{ id: string; readAt: string | null }>(
    `/announcements/${encodeURIComponent(announcementId)}/read`,
    { method: "POST" },
  );
}

export function getWorkspaces(): Promise<WorkspaceItem[]> {
  return apiRequest<WorkspaceItem[]>("/workspaces");
}

export function getConversations(workspaceId: string): Promise<ChatConversation[]> {
  return apiRequest<ChatConversation[]>(`/workspaces/${encodeURIComponent(workspaceId)}/chat/conversations`);
}

export async function getChatMessages(workspaceId: string, conversationId: string): Promise<ChatMessage[]> {
  const page = await apiRequest<ChatMessagePage>(
    `/workspaces/${encodeURIComponent(workspaceId)}/chat/conversations/${encodeURIComponent(conversationId)}/messages?limit=50`,
  );
  return page.messages;
}

export function sendChatMessage(
  workspaceId: string,
  conversationId: string,
  content: string,
): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(
    `/workspaces/${encodeURIComponent(workspaceId)}/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
}
