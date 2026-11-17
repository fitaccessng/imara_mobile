import { requestPasswordReset } from "@/auth/auth-api";
import { AuthFrame, Field, Notice, PrimaryButton } from "@/ui/components";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(normalizedEmail);
      router.replace({
        pathname: "/(auth)/reset-password",
        params: { email: normalizedEmail },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t send that request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="ACCOUNT RECOVERY"
      title="Let’s get you back in."
      description="Enter your email and we’ll send a six-digit password reset code."
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
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />
      {error ? <Notice>{error}</Notice> : null}
      <PrimaryButton title="Send reset code" onPress={() => void submit()} loading={loading} />
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
