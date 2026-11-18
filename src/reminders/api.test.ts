import { apiRequest } from "@/api/client";
import {
  cancelWorkspaceReminder,
  completeWorkspaceReminder,
  createWorkspaceReminder,
  getWorkspaceReminders,
  updateWorkspaceReminder,
} from "@/reminders/api";

jest.mock("@/api/client", () => ({
  apiRequest: jest.fn(),
}));

const request = jest.mocked(apiRequest);

describe("workspace reminder API", () => {
  beforeEach(() => {
    request.mockResolvedValue({} as never);
  });

  it("uses the current collection and reminder mutation routes", async () => {
    const input = {
      title: "Send proposal",
      dueAt: "2026-11-18T10:00:00.000Z",
      recurrence: "WEEKLY" as const,
      assignedToUserId: "user/id",
      emailEnabled: true,
    };
    await getWorkspaceReminders("workspace/id");
    await createWorkspaceReminder("workspace/id", input);
    await updateWorkspaceReminder("workspace/id", "reminder/id", { title: "Review proposal" });
    await completeWorkspaceReminder("workspace/id", "reminder/id");
    await cancelWorkspaceReminder("workspace/id", "reminder/id");

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces/workspace%2Fid/reminders");
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/reminders", {
      method: "POST",
      body: JSON.stringify(input),
    });
    expect(request).toHaveBeenNthCalledWith(3, "/workspaces/workspace%2Fid/reminders/reminder%2Fid", {
      method: "PATCH",
      body: JSON.stringify({ title: "Review proposal" }),
    });
    expect(request).toHaveBeenNthCalledWith(4, "/workspaces/workspace%2Fid/reminders/reminder%2Fid/complete", { method: "POST" });
    expect(request).toHaveBeenNthCalledWith(5, "/workspaces/workspace%2Fid/reminders/reminder%2Fid/cancel", { method: "POST" });
  });
});
