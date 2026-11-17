import { Redirect } from "expo-router";

import { useAuthStore } from "@/auth/auth-store";
import { PrimaryButton, ScreenMessage } from "@/ui/components";

export default function IndexRoute() {
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const initialize = useAuthStore((state) => state.initialize);

  if (status === "signedIn") return <Redirect href="/(app)" />;
  if (status === "signedOut") return <Redirect href="/(auth)/login" />;
  if (status === "error") {
    return (
      <ScreenMessage
        title="We couldn’t check your session."
        message={error ?? "Check your connection and try again. Your saved session has not been removed."}
        action={<PrimaryButton title="Try again" onPress={() => void initialize()} />}
      />
    );
  }

  return <ScreenMessage title="Your space, in sync." message="Checking your secure IMARA session…" />;
}
