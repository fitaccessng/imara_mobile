import { ApiError } from "@/api/client";
import { signIn, resendVerification } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { AuthFrame, Field, Notice, PrimaryButton, TextLink } from "@/ui/components";
import { colors } from "@/ui/theme";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function LoginScreen() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  async function submit(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password || password.length > 128) {
      setError("Enter your password (up to 128 characters).");
      return;
    }

    setError("");
    setResendMessage("");
    setVerificationRequired(false);
    setLoading(true);
    try {
      const result = await signIn(normalizedEmail, password);
      setAuthenticated(result);
      router.replace("/(app)");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "We couldn’t sign you in.";
      setError(message);
      setVerificationRequired(
        caught instanceof ApiError && caught.status === 403 && message.toLowerCase().includes("verify"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendCode(): Promise<void> {
    setLoading(true);
    setResendMessage("");
    try {
      await resendVerification(email.trim().toLowerCase());
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: email.trim().toLowerCase() },
      });
    } catch (caught) {
      setResendMessage(caught instanceof Error ? caught.message : "We couldn’t resend the verification email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="WELCOME BACK"
      title="Your work, right where you left it."
      description="Sign in to your secure IMARA space."
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
        label="Password"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        secureTextEntry
        placeholder="Your password"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />

      <View style={styles.forgotRow}>
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
        </Link>
      </View>

      {error ? <Notice>{error}</Notice> : null}
      {resendMessage ? <Notice>{resendMessage}</Notice> : null}
      {verificationRequired ? (
        <View style={styles.verifyActions}>
          <TextLink
            title="Enter your verification code"
            onPress={() =>
              router.push({
                pathname: "/(auth)/verify-email",
                params: { email: email.trim().toLowerCase() },
              })
            }
          />
          <TextLink title="Resend verification email" onPress={() => void resendCode()} disabled={loading} />
        </View>
      ) : null}

      <PrimaryButton title="Sign in" onPress={() => void submit()} loading={loading} />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>New to IMARA?</Text>
        <Link href="/(auth)/register" asChild>
          <Pressable accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
        </Link>
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  forgotRow: {
    alignItems: "flex-end",
    marginTop: -7,
  },
  link: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
  },
  verifyActions: {
    alignItems: "center",
    gap: 4,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 5,
    paddingTop: 2,
  },
  switchText: {
    color: colors.muted,
    fontSize: 14,
  },
});
