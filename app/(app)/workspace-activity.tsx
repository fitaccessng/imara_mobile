import { Link, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getWorkspaceActivity, getWorkspaceChoices, type WorkspaceActivity } from "@/workspaces/api";
import { colors } from "@/ui/theme";

export default function WorkspaceActivityScreen() {
  const params = useLocalSearchParams<{ workspaceId?: string | string[] }>();
  const workspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspaces = workspacesQuery.data ?? [];
  const activeWorkspaceId = workspaceId ?? workspaces[0]?.id;
  const workspace = workspaces.find((item) => item.id === activeWorkspaceId) ?? null;
  const canView = workspace?.role === "OWNER" || workspace?.role === "ADMIN";
  const activityQuery = useQuery({
    queryKey: ["workspace-activity", activeWorkspaceId],
    queryFn: () => getWorkspaceActivity(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId && canView),
  });

  if (workspacesQuery.isPending) return <State title="Loading workspace…" />;
  if (workspacesQuery.isError) return <State title="Workspace could not load" detail={message(workspacesQuery.error)} />;
  if (!workspace) return <State title="Workspace not found" detail="Return to the team page and select a workspace." />;
  if (!canView) return <State title="Activity access is restricted" detail="Only workspace owners and administrators can view the audit log." />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>BUSINESS · AUDIT</Text>
        <Text style={styles.title}>Workspace activity</Text>
        <Text style={styles.subtitle}>{workspace.name} · Most recent server audit entries</Text>
      </View>
      {activityQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
      {activityQuery.isError ? <State title="Activity couldn’t load" detail={message(activityQuery.error)} retry={() => void activityQuery.refetch()} /> : null}
      {(activityQuery.data ?? []).map((item) => <ActivityCard key={item.id} item={item} />)}
      {activityQuery.data?.length === 0 ? <State title="No activity yet" detail="Workspace audit entries will appear here when actions are recorded." /> : null}
      <Link href={{ pathname: "/(app)/workspace-team", params: { workspaceId: workspace.id } }} asChild>
        <Pressable><Text style={styles.back}>Back to team</Text></Pressable>
      </Link>
    </ScrollView>
  );
}

function ActivityCard({ item }: { item: WorkspaceActivity }) {
  return (
    <View style={styles.card}>
      <View style={styles.activityTop}>
        <Text style={styles.action}>{formatAction(item.action)}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>
      <Text style={styles.actor}>{item.actor?.name ?? item.actor?.email ?? "Workspace system"}</Text>
      <Text style={styles.meta}>{item.targetType}{item.targetId ? ` · ${item.targetId}` : ""}</Text>
    </View>
  );
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.action}>{title}</Text>
      {detail ? <Text style={styles.subtitle}>{detail}</Text> : <ActivityIndicator color={colors.green} />}
      {retry ? <Pressable onPress={retry}><Text style={styles.back}>Try again</Text></Pressable> : null}
    </View>
  );
}

function formatAction(action: string): string {
  return action.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36, gap: 12 },
  header: { gap: 6, marginBottom: 3 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderRadius: 15, borderColor: colors.line, borderWidth: 1, padding: 13, gap: 5 },
  activityTop: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" },
  action: { color: colors.ink, fontSize: 13, fontWeight: "800", flex: 1 },
  date: { color: colors.muted, fontSize: 9 },
  actor: { color: colors.greenDark, fontSize: 11, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 10 },
  state: { alignItems: "center", gap: 8, padding: 20, backgroundColor: colors.surface, borderRadius: 16 },
  back: { color: colors.greenDark, fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 8 },
});
