import { register, signIn } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { AuthFrame, Field, Notice, PrimaryButton } from "@/ui/components";
import { colors } from "@/ui/theme";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type AccountType = "PERSONAL" | "BUSINESS";

export default function RegisterScreen() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("PERSONAL");
  const [workspaceName, setWorkspaceName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim() || name.trim().length > 120) {
      setError("Enter your name using 1–120 characters.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 320) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6 || password.length > 128 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])/.test(password)) {
      setError("Use 6–128 characters, including uppercase and lowercase letters, a number, and a symbol.");
      return;
    }
    if (accountType === "BUSINESS" && workspaceName.trim().length > 160) {
      setError("Use 160 characters or fewer for your workspace name.");
      return;
    }
    if (referralCode && (!/^[A-Za-z0-9]{8,32}$/.test(referralCode.trim()))) {
      setError("Referral codes must be 8–32 letters or numbers.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await register({
        name: name.trim(),
        email: normalizedEmail,
        password,
        accountType,
        ...(accountType === "BUSINESS" && workspaceName.trim()
          ? { workspaceName: workspaceName.trim() }
          : {}),
        ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
      });

      if (result.emailVerified) {
        const authResult = await signIn(normalizedEmail, password);
        setAuthenticated(authResult);
        router.replace("/(app)");
        return;
      }

      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email: normalizedEmail },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="CREATE YOUR SPACE"
      title="A calmer place for everything."
      description="Create one IMARA account for your personal files and business workspace."
    >
      <View style={styles.accountChoices}>
        <Text style={styles.choiceLabel}>Choose your space</Text>
        <View style={styles.choiceRow}>
          {(["PERSONAL", "BUSINESS"] as const).map((type) => {
            const selected = accountType === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setAccountType(type)}
                style={[styles.choice, selected ? styles.choiceSelected : null]}
              >
                <Text style={[styles.choiceTitle, selected ? styles.choiceTitleSelected : null]}>
                  {type === "PERSONAL" ? "Personal" : "Business"}
                </Text>
                <Text style={styles.choiceDetail}>
                  {type === "PERSONAL" ? "Your private files" : "Work with your team"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Field
        label="Full name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        placeholder="Your name"
        returnKeyType="next"
      />
      {accountType === "BUSINESS" ? (
        <Field
          label="Workspace name (optional)"
          value={workspaceName}
          onChangeText={setWorkspaceName}
          autoCapitalize="words"
          placeholder="Your company or team"
          maxLength={160}
          returnKeyType="next"
        />
      ) : null}
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
        label="Create a password"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
        placeholder="At least 6 characters"
        returnKeyType="next"
      />
      <Field
        label="Referral code (optional)"
        value={referralCode}
        onChangeText={setReferralCode}
        autoCapitalize="characters"
        placeholder="Code"
        maxLength={32}
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />

      {error ? <Notice>{error}</Notice> : null}
      <PrimaryButton title="Create account" onPress={() => void submit()} loading={loading} />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Already have an account?</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        </Link>
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  accountChoices: {
    gap: 9,
  },
  choiceLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  choiceRow: {
    flexDirection: "row",
    gap: 9,
  },
  choice: {
    flex: 1,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "#FCFDFB",
    padding: 12,
  },
  choiceSelected: {
    borderColor: colors.green,
    backgroundColor: "#F1F8F1",
  },
  choiceTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  choiceTitleSelected: {
    color: colors.greenDark,
  },
  choiceDetail: {
    color: colors.muted,
    fontSize: 11,
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
  link: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
  },
});
