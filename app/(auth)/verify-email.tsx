import { ApiError } from "@/api/client";
import { resendVerification, verifyEmailCode } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { AuthFrame, Field, Notice, PrimaryButton, TextLink } from "@/ui/components";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter the email address you used to register.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await verifyEmailCode(normalizedEmail, code);
      setAuthenticated(result);
      router.replace("/(app)");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t verify your email.");
    } finally {
      setLoading(false);
    }
  }

  async function resend(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resendVerification(normalizedEmail);
      setMessage("If the address needs verification, a new code will be sent.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t resend the verification email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="ONE LAST STEP"
      title="Confirm it’s really you."
      description="Enter the six-digit code we sent to your email address."
    >
      <Field
        label="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
        returnKeyType="next"
      />
      <Field
        label="Six-digit code"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
        autoCapitalize="none"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        placeholder="000000"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={() => void verify()}
      />
      {error ? <Notice>{error}</Notice> : null}
      {message ? <Notice success>{message}</Notice> : null}
      <PrimaryButton title="Verify email" onPress={() => void verify()} loading={loading} />
      <TextLink title="Send a new verification code" onPress={() => void resend()} disabled={loading} />
      <Link href="/(auth)/login" asChild>
        <Pressable accessibilityRole="button" style={styles.backLink}>
          <Text style={styles.backText}>Back to sign in</Text>
        </Pressable>
      </Link>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  backLink: {
    alignSelf: "center",
    padding: 6,
  },
  backText: {
    color: "#718078",
    fontSize: 13,
    fontWeight: "600",
  },
});
