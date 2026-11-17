import { resetPassword } from "@/auth/auth-api";
import { AuthFrame, Field, Notice, PrimaryButton, TextLink } from "@/ui/components";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit reset code.");
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError("Use a password between 12 and 128 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await resetPassword(normalizedEmail, code, password);
      setComplete(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t reset your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="CHOOSE A NEW PASSWORD"
      title={complete ? "You’re back in control." : "Make it strong and memorable."}
      description={
        complete
          ? "Your password has been updated. Sign in with your new details."
          : "Use the code from your email and choose a new password."
      }
    >
      {complete ? (
        <>
          <Notice success>Your password has been reset successfully.</Notice>
          <PrimaryButton title="Go to sign in" onPress={() => router.replace("/(auth)/login")} />
        </>
      ) : (
        <>
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
            label="Six-digit reset code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            autoCapitalize="none"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            placeholder="000000"
            maxLength={6}
            returnKeyType="next"
          />
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            placeholder="At least 12 characters"
            returnKeyType="next"
          />
          <Field
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            placeholder="Enter your new password again"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
          {error ? <Notice>{error}</Notice> : null}
          <PrimaryButton title="Reset password" onPress={() => void submit()} loading={loading} />
          <TextLink title="Back to sign in" onPress={() => router.replace("/(auth)/login")} />
        </>
      )}
      {!complete ? (
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable accessibilityRole="button" style={styles.backLink}>
            <Text style={styles.backText}>Request a new code</Text>
          </Pressable>
        </Link>
      ) : null}
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
