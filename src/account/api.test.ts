import { apiRequest } from "@/api/client";
import {
  changePassword,
  createCheckout,
  getDashboard,
  getPayment,
  getPayments,
  getPlans,
  getProfile,
  getSessions,
  getSubscription,
  revokeSession,
  updateProfile,
} from "@/account/api";

jest.mock("@/api/client", () => ({ apiRequest: jest.fn() }));

const request = jest.mocked(apiRequest);

describe("account API", () => {
  beforeEach(() => request.mockResolvedValue({} as never));

  it("uses profile, dashboard and subscription routes", async () => {
    await getProfile();
    await updateProfile("Ada Lovelace");
    await getDashboard();
    await getSubscription();
    await getPlans();

    expect(request).toHaveBeenNthCalledWith(1, "/users/me");
    expect(request).toHaveBeenNthCalledWith(2, "/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name: "Ada Lovelace" }),
    });
    expect(request).toHaveBeenNthCalledWith(3, "/dashboard/summary");
    expect(request).toHaveBeenNthCalledWith(4, "/subscription");
    expect(request).toHaveBeenNthCalledWith(5, "/plans");
  });

  it("uses session, password and payment routes", async () => {
    await getSessions();
    await revokeSession("session/id");
    await changePassword("old-secret", "new-secret");
    await createCheckout("PRO");
    await getPayments();
    await getPayment("checkout/id");

    expect(request).toHaveBeenNthCalledWith(1, "/auth/sessions");
    expect(request).toHaveBeenNthCalledWith(2, "/auth/sessions/session%2Fid", { method: "DELETE" });
    expect(request).toHaveBeenNthCalledWith(3, "/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "old-secret", newPassword: "new-secret" }),
    });
    expect(request).toHaveBeenNthCalledWith(4, "/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "PRO" }),
    });
    expect(request).toHaveBeenNthCalledWith(5, "/billing/payments");
    expect(request).toHaveBeenNthCalledWith(6, "/billing/payments/checkout%2Fid");
  });
});
