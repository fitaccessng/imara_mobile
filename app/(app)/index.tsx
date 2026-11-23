import { useQuery } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/api/client";
import { getDashboard, getSubscription } from "@/account/api";
import { getCurrentUser, signOut } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { BrandMark, Notice, PrimaryButton, TextLink } from "@/ui/components";
import { colors, typography } from "@/ui/theme";

const quickActions = [
  { label: "Upload", meta: "New files", href: "/(app)/files" },
  { label: "Tasks", meta: "Deadlines and progress", href: "/(app)/tasks" },
  { label: "Meetings", meta: "Notes and action items", href: "/(app)/meetings" },
  { label: "Workspace", meta: "Business tools", href: "/(app)/workspace" },
  { label: "Productivity", meta: "Workflow tools", href: "/(app)/productivity" },
  { label: "Schedule", meta: "Calendar", href: "/(app)/calendar" },
  { label: "All pages", meta: "Browse every screen", href: "/(app)/all-pages" },
];

const recentItems = [
  { name: "Q3 Strategy Deck", meta: "Finance · Updated 2h ago", tag: "PDF", accent: colors.greenWash },
  { name: "Board Minutes", meta: "Operations · Updated today", tag: "DOC", accent: colors.sand },
  { name: "Client Onboarding", meta: "Inbox · Shared with team", tag: "FOLDER", accent: colors.greenWash },
  { name: "Campaign Assets", meta: "Marketing · Updated yesterday", tag: "ZIP", accent: colors.sand },
  { name: "Vendor Contracts", meta: "Legal · Needs review", tag: "PDF", accent: colors.greenWash },
  { name: "Quarterly Budget", meta: "Finance · Shared", tag: "XLS", accent: colors.sand },
];

const upcomingEvents = [
  { title: "Team sync", detail: "9:30 AM · Strategy room", status: "Confirmed" },
  { title: "Approval review", detail: "11:00 AM · Budget draft", status: "Pending" },
  { title: "Design handoff", detail: "2:15 PM · Marketing pack", status: "Due today" },
];

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const clearAuthentication = useAuthStore((state) => state.clearAuthentication);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const profile = useQuery({
    queryKey: ["auth", "me", user?.id],
    queryFn: getCurrentUser,
    initialData: user ?? undefined,
    staleTime: 60_000,
  });
  const dashboard = useQuery({
    queryKey: ["dashboard", "summary", user?.id],
    queryFn: getDashboard,
  });
  const subscription = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: getSubscription,
  });

  useEffect(() => {
    if (profile.error instanceof ApiError && profile.error.status === 401) {
      void clearAuthentication().catch((error: unknown) => {
        setLogoutError(error instanceof Error ? error.message : "The local session could not be cleared.");
      });
    }
  }, [clearAuthentication, profile.error]);

  async function onSignOut(): Promise<void> {
    setLogoutError("");
    setLoggingOut(true);
    try {
      await signOut();
      await clearAuthentication();
      router.replace("/(auth)/login");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearAuthentication();
        router.replace("/(auth)/login");
      } else {
        setLogoutError(error instanceof Error ? error.message : "We couldn’t sign you out.");
      }
    } finally {
      setLoggingOut(false);
    }
  }

  const displayName = (profile.data?.name ?? user?.name ?? "there").trim().split(/\s+/)[0];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <View style={styles.header}>
        <BrandMark />
        <View style={styles.secureBadge}>
          <View style={styles.secureDot} />
          <Text style={styles.secureText}>PERSONAL SPACE</Text>
        </View>
      </View>

      <View style={styles.welcome}>
        <Text style={styles.kicker}>WELCOME BACK</Text>
        <Text style={styles.title}>Good to have you,{`\n`}{displayName}.</Text>
        <Text style={styles.subtitle}>Your files, approvals, and daily work stay synced with your IMARA account.</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{dashboard.isPending ? "—" : dashboard.data?.fileCount ?? "0"}</Text>
          <Text style={styles.summaryLabel}>Total files</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{dashboard.isPending ? "—" : dashboard.data?.folderCount ?? "0"}</Text>
          <Text style={styles.summaryLabel}>Folders</Text>
        </View>
      </View>

      <View style={styles.quickActionGrid}>
        {quickActions.map((item) => (
          <Link key={item.label} href={item.href as any} asChild>
            <Pressable style={styles.quickAction}>
              <Text style={styles.quickActionLabel}>{item.label}</Text>
              <Text style={styles.quickActionMeta}>{item.meta}</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent work</Text>
          <Link href="/(app)/files" asChild>
            <Pressable>
              <Text style={styles.sectionAction}>View all</Text>
            </Pressable>
          </Link>
        </View>
        <View style={styles.listBlock}>
          {dashboard.isPending ? (
            <Text style={styles.footer}>Loading recent work…</Text>
          ) : dashboard.isError ? (
            <TextLink title="Retry recent work" onPress={() => void dashboard.refetch()} />
          ) : (() => {
            const files = dashboard.data?.recentFiles ?? [];
            const folders = dashboard.data?.recentFolders ?? [];
            const combined = [
              ...files.map((item) => ({ id: item.id, name: item.name, meta: item.mimeType, tag: "FILE", accent: colors.greenWash })),
              ...folders.map((item) => ({ id: item.id, name: item.name, meta: item.createdAt, tag: "FOLDER", accent: colors.sand })),
            ].sort((a, b) => String(b.meta).localeCompare(String(a.meta))).slice(0, 6);
            return combined.length ? combined.map((item) => (
              <View key={`${item.tag}-${item.id}`} style={styles.listItem}>
                <View style={[styles.listIcon, { backgroundColor: item.accent }]} />
                <View style={styles.listCopy}>
                  <Text numberOfLines={1} style={styles.listTitle}>{item.name}</Text>
                  <Text style={styles.listMeta}>{item.tag === "FOLDER" ? "Recently updated folder" : item.meta}</Text>
                </View>
                <Text style={styles.listTag}>{item.tag}</Text>
              </View>
            )) : <Text style={styles.footer}>No recently worked-on files or folders yet.</Text>;
          })()}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today</Text>
          <Link href="/(app)/calendar" asChild>
            <Pressable>
              <Text style={styles.sectionAction}>Open calendar</Text>
            </Pressable>
          </Link>
        </View>
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitle}>Review your calendar</Text>
              <Text style={styles.timelineDetail}>Open today’s plan, events and reminders.</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.phaseCard}>
        <Text style={styles.phaseTag}>YOUR ACCOUNT</Text>
        <Text style={styles.phaseTitle}>{subscription.isPending ? "Checking plan…" : `${subscription.data?.plan ?? "FREE"} plan`}</Text>
        <Text style={styles.phaseBody}>Account features and storage limits follow your server-provided subscription status.</Text>
        <View style={styles.phaseRule} />
        <Text style={styles.phaseFootnote}>Connected to your IMARA account · Permission-aware layout</Text>
      </View>

      {logoutError ? <Notice>{logoutError}</Notice> : null}
      {profile.isError && !(profile.error instanceof ApiError && profile.error.status === 401) ? (
        <>
          <Notice>{profile.error instanceof Error ? profile.error.message : "Could not refresh account details."}</Notice>
          <TextLink title="Retry account details" onPress={() => void profile.refetch()} />
        </>
      ) : null}

      <PrimaryButton title="Sign out securely" onPress={() => void onSignOut()} loading={loggingOut} />
      <Text style={styles.footer}>Your files remain protected by your account permissions.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  secureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  secureText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  welcome: {
    paddingTop: 12,
    gap: 10,
  },
  kicker: {
    color: colors.greenDark,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  title: {
    ...typography.title,
    fontSize: 34,
    lineHeight: 41,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 15,
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  summaryLabel: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickAction: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 72,
    justifyContent: "center",
  },
  quickActionLabel: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  quickActionMeta: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionAction: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  listBlock: {
    gap: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  listCopy: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  listMeta: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  listTag: {
    color: colors.greenDark,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    backgroundColor: colors.greenWash,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: "hidden",
  },
  timeline: {
    gap: 10,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  timelineBody: {
    flex: 1,
    gap: 2,
  },
  timelineTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  timelineDetail: {
    color: colors.muted,
    fontSize: 11,
  },
  timelineStatus: {
    color: colors.greenDark,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    backgroundColor: colors.greenWash,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: "hidden",
  },
  phaseCard: {
    overflow: "hidden",
    gap: 12,
    borderRadius: 22,
    borderCurve: "continuous",
    backgroundColor: colors.ink,
    padding: 21,
  },
  phaseTag: {
    color: colors.greenWash,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  phaseTitle: {
    color: colors.surface,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
  },
  phaseBody: {
    color: "#D7E5DC",
    fontSize: 14,
    lineHeight: 22,
  },
  phaseRule: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  phaseFootnote: {
    color: "#B7CBBF",
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
});
