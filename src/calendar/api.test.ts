import { apiRequest } from "@/api/client";
import { deleteCalendarEvent, getCalendarEvents, saveCalendarEvent } from "@/calendar/api";

jest.mock("@/api/client", () => ({
  apiRequest: jest.fn(),
}));

const request = jest.mocked(apiRequest);

describe("calendar API", () => {
  beforeEach(() => {
    request.mockResolvedValue({} as never);
  });

  it("uses the current personal calendar list and event mutation routes", async () => {
    const event = {
      title: "Planning",
      description: "Quarterly review",
      startsAt: "2026-11-17T09:00:00.000Z",
      endsAt: "2026-11-17T10:00:00.000Z",
      allDay: false,
      reminderMinutesBefore: 15,
    };
    await getCalendarEvents();
    await saveCalendarEvent(event);
    await saveCalendarEvent(event, undefined, "event/id");
    await deleteCalendarEvent("event/id");

    expect(request).toHaveBeenNthCalledWith(1, "/calendar/events");
    expect(request).toHaveBeenNthCalledWith(2, "/calendar/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    expect(request).toHaveBeenNthCalledWith(3, "/calendar/events/event%2Fid", {
      method: "PATCH",
      body: JSON.stringify(event),
    });
    expect(request).toHaveBeenNthCalledWith(4, "/calendar/events/event%2Fid", { method: "DELETE" });
  });

  it("uses the current workspace calendar routes and member tags", async () => {
    const event = {
      title: "Team session",
      startsAt: "2026-11-17T09:00:00.000Z",
      endsAt: "2026-11-17T10:00:00.000Z",
      allDay: false,
      reminderMinutesBefore: null,
      taggedUserIds: ["user/id"],
    };
    await getCalendarEvents("workspace/id");
    await saveCalendarEvent(event, "workspace/id");
    await saveCalendarEvent(event, "workspace/id", "event/id");
    await deleteCalendarEvent("event/id", "workspace/id");

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces/workspace%2Fid/calendar/events");
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/calendar/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    expect(request).toHaveBeenNthCalledWith(3, "/workspaces/workspace%2Fid/calendar/events/event%2Fid", {
      method: "PATCH",
      body: JSON.stringify(event),
    });
    expect(request).toHaveBeenNthCalledWith(4, "/workspaces/workspace%2Fid/calendar/events/event%2Fid", { method: "DELETE" });
  });
});
