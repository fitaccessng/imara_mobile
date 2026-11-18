import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  changePassword,
  getProfile,
  getSessions,
  getSubscription,
  revokeSession,
  updateProfile,
  type SessionItem,
} from "@/account/api";
import { signOut } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { router } from "expo-router";
import { colors } from "@/ui/theme";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function AccountSettingsScreen() {
  const queryClient = useQueryClient();
  const clearAuthentication = useAuthStore((state) => state.clearAuthentication);
  const profileQuery = useQuery({ queryKey: ["account-profile"], queryFn: getProfile });
  const sessionsQuery = useQuery({ queryKey: ["account-sessions"], queryFn: getSessions });
  const subscriptionQuery = useQuery({ queryKey: ["account-subscription"], queryFn: getSubscription });

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (profileQuery.data?.name && !name) setName(profileQuery.data.name);
  }, [name, profileQuery.data]);

  const saveProfile = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Enter your display name.");
      return updateProfile(name.trim());
    },
    onSuccess: async () => {
      setError("");
      setNotice("Profile updated.");
      await queryClient.invalidateQueries({ queryKey: ["account-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Profile could not be updated."),
  });

  const password = useMutation({
    mutationFn: () => {
      if (!currentPassword) throw new Error("Enter your current password.");
      if (newPassword.length < 8) throw new Error("Use at least 8 characters for the new password.");
      if (newPassword !== confirmPassword) throw new Error("New passwords do not match.");
      return changePassword(currentPassword, newPassword);
    },
    onSuccess: async () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setNotice("Password changed. Sign in again to confirm the updated session.");
      try {
        await signOut();
      } catch {
        // The server password change already invalidates the session.
      }
      await clearAuthentication();
      router.replace("/(auth)/login");
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Password could not be changed."),
  });

  const revoke = useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: async () => {
      setNotice("Session revoked.");
      await queryClient.invalidateQueries({ queryKey: ["account-sessions"] });
    },
  });

  function confirmRevoke(session: SessionItem) {
    Alert.alert(session.isCurrent ? "Sign out this device?" : "Revoke this session?", session.isCurrent ? "This will end the current mobile session." : "This device will no longer be able to use this account session.", [
      { text: "Cancel", style: "cancel" },
      { text: "Revoke", style: "destructive", onPress: () => revoke.mutate(session.id) },
    ]);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}><Text style={styles.kicker}>ACCOUNT</Text><Text style={styles.title}>Settings</Text><Text style={styles.subtitle}>Profile, security and account controls.</Text></View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile</Text>
        {profileQuery.isPending ? <Text style={styles.meta}>Loading profile…</Text> : profileQuery.isError ? <Pressable onPress={() => void profileQuery.refetch()}><Text style={styles.retry}>Retry profile</Text></Pressable> : (
          <>
            <Text style={styles.meta}>{profileQuery.data?.email}</Text>
            <Text style={styles.label}>Display name</Text>
            <TextInput maxLength={120} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input} />
            <Pressable disabled={saveProfile.isPending} onPress={() => { setError(""); setNotice(""); saveProfile.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{saveProfile.isPending ? "Saving…" : "Save profile"}</Text></Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Change password</Text>
        <Text style={styles.label}>Current password</Text><TextInput secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor={colors.muted} style={styles.input} />
        <Text style={styles.label}>New password</Text><TextInput secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={styles.input} />
        <Text style={styles.label}>Confirm new password</Text><TextInput secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat new password" placeholderTextColor={colors.muted} style={styles.input} />
        <Pressable disabled={password.isPending} onPress={() => { setError(""); setNotice(""); password.mutate(); }} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{password.isPending ? "Changing…" : "Change password"}</Text></Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Active sessions</Text>
        {sessionsQuery.isPending ? <Text style={styles.meta}>Loading sessions…</Text> : sessionsQuery.isError ? <Pressable onPress={() => void sessionsQuery.refetch()}><Text style={styles.retry}>Retry sessions</Text></Pressable> : (sessionsQuery.data ?? []).map((session) => (
          <View key={session.id} style={styles.sessionRow}><View style={styles.sessionCopy}><Text style={styles.sessionTitle}>{session.isCurrent ? "This device" : "Active session"}</Text><Text numberOfLines={2} style={styles.meta}>{session.userAgent ?? "Unknown device"}</Text><Text style={styles.meta}>Created {dateFormat.format(new Date(session.createdAt))}</Text></View><Pressable onPress={() => confirmRevoke(session)} style={styles.cancelButton}><Text style={styles.cancelText}>Revoke</Text></Pressable></View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        {subscriptionQuery.isPending ? <Text style={styles.meta}>Loading subscription…</Text> : subscriptionQuery.isError ? <Pressable onPress={() => void subscriptionQuery.refetch()}><Text style={styles.retry}>Retry subscription</Text></Pressable> : (
          <><Text style={styles.planName}>{subscriptionQuery.data?.plan ?? "FREE"}</Text><Text style={styles.meta}>{subscriptionQuery.data?.status ?? "Server-confirmed account status"}</Text><Pressable onPress={() => router.push("/(app)/billing" as any)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>View plans and payment</Text></Pressable></>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { gap: 4 },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  card: { gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 12 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  planName: { color: colors.greenDark, fontSize: 20, fontWeight: "800" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 2 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.background, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },
  meta: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  secondaryButton: { backgroundColor: colors.greenWash, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  secondaryButtonText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  cancelButton: { backgroundColor: colors.redWash, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8 },
  cancelText: { color: colors.red, fontSize: 9, fontWeight: "800" },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  sessionCopy: { flex: 1, gap: 2 },
  sessionTitle: { color: colors.text, fontSize: 10, fontWeight: "800" },
  error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 10, padding: 9, fontSize: 10 },
  notice: { color: colors.greenDark, backgroundColor: colors.greenWash, borderRadius: 10, padding: 9, fontSize: 10, fontWeight: "700" },
  retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
});
