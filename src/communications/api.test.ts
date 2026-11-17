import { apiRequest } from "@/api/client";
import {
  getAnnouncements,
  getAllNotifications,
  getChatMessages,
  getConversations,
  getNotifications,
  getWorkspaces,
  markAnnouncementRead,
  markNotificationRead,
  markWorkspaceNotificationRead,
  sendChatMessage,
} from "@/communications/api";

jest.mock("@/api/client", () => ({
  apiRequest: jest.fn(),
}));

const request = jest.mocked(apiRequest);

describe("communications API", () => {
  beforeEach(() => {
    request.mockResolvedValue([] as never);
  });

  it("uses the existing personal notification and announcement routes", async () => {
    await getNotifications();
    await markNotificationRead("notice/id");
    await getAnnouncements();
    await markAnnouncementRead("announcement/id");

    expect(request).toHaveBeenNthCalledWith(1, "/notifications");
    expect(request).toHaveBeenNthCalledWith(2, "/notifications/notice%2Fid/read", { method: "POST" });
    expect(request).toHaveBeenNthCalledWith(3, "/announcements");
    expect(request).toHaveBeenNthCalledWith(4, "/announcements/announcement%2Fid/read", { method: "POST" });
  });

  it("combines personal and authorized workspace notifications in date order", async () => {
    request.mockImplementation(async (path) => {
      if (path === "/notifications") {
        return [{ id: "personal", createdAt: "2026-01-01T10:00:00.000Z" }] as never;
      }
      if (path === "/workspaces") {
        return [{ id: "workspace-1", name: "Team", role: "STAFF" }] as never;
      }
      return [{ id: "workspace-notice", createdAt: "2026-01-02T10:00:00.000Z" }] as never;
    });

    const notifications = await getAllNotifications();

    expect(notifications.map(({ id }) => id)).toEqual(["workspace-notice", "personal"]);
    expect(notifications[0]?.workspaceId).toBe("workspace-1");
    expect(request).toHaveBeenCalledWith("/workspaces/workspace-1/notifications");
  });

  it("uses the workspace-scoped notification read route", async () => {
    await markWorkspaceNotificationRead("workspace-id", "notification-id");

    expect(request).toHaveBeenCalledWith(
      "/workspaces/workspace-id/notifications/notification-id/read",
      { method: "POST" },
    );
  });

  it("uses authorized workspace routes for chat and encodes route identifiers", async () => {
    await getWorkspaces();
    await getConversations("workspace/id");
    await getChatMessages("workspace/id", "conversation/id");
    await sendChatMessage("workspace/id", "conversation/id", "Hello");

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces");
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/chat/conversations");
    expect(request).toHaveBeenNthCalledWith(
      3,
      "/workspaces/workspace%2Fid/chat/conversations/conversation%2Fid/messages?limit=50",
    );
    expect(request).toHaveBeenNthCalledWith(
      4,
      "/workspaces/workspace%2Fid/chat/conversations/conversation%2Fid/messages",
      { method: "POST", body: JSON.stringify({ content: "Hello" }) },
    );
  });
});
