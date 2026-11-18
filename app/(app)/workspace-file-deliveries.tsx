import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as Sharing from "expo-sharing";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "@/auth/auth-store";
import { getWorkspaceFileDeliveryDownloadPath, getWorkspaceFileDeliveries, type WorkspaceFileDelivery } from "@/files/deliveries-api";
import { downloadAuthenticatedFile } from "@/files/download";
import { getWorkspaceChoices } from "@/workspaces/api";
import { colors } from "@/ui/theme";

type DeliveryView = "received" | "sent";
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function WorkspaceFileDeliveriesScreen() {
  const user = useAuthStore((state) => state.user);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [view, setView] = useState<DeliveryView>("received");
  const [downloadError, setDownloadError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspaces = workspacesQuery.data ?? [];
  const workspace = workspaces.find((item) => item.id === workspaceId) ?? workspaces[0] ?? null;
  const deliveriesQuery = useQuery({
    queryKey: ["workspace-file-deliveries", workspace?.id],
    queryFn: () => getWorkspaceFileDeliveries(workspace!.id),
    enabled: Boolean(workspace),
  });
  const deliveries = deliveriesQuery.data ?? [];
  const received = useMemo(() => deliveries.filter((delivery) => delivery.recipient.id === user?.id), [deliveries, user?.id]);
  const sent = useMemo(() => deliveries.filter((delivery) => delivery.sender.id === user?.id), [deliveries, user?.id]);
  const visible = view === "received" ? received : sent;

  async function download(delivery: WorkspaceFileDelivery) {
    if (!workspace) return;
    setDownloadError("");
    setDownloadingId(delivery.id);
    try {
      const file = await downloadAuthenticatedFile(
        getWorkspaceFileDeliveryDownloadPath(workspace.id, delivery.id),
        { id: delivery.file.id, name: delivery.file.name, mimeType: delivery.file.mimeType },
      );
      if (!(await Sharing.isAvailableAsync())) throw new Error("File sharing is not available on this device.");
      await Sharing.shareAsync(file.uri, { mimeType: delivery.file.mimeType, dialogTitle: delivery.file.name });
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "The file could not be downloaded.");
    } finally {
      setDownloadingId("");
    }
  }

  if (workspacesQuery.isPending) return <State title="Loading workspace…" />;
  if (workspacesQuery.isError) return <State title="Workspace couldn’t load" detail={message(workspacesQuery.error)} retry={() => void workspacesQuery.refetch()} />;
  if (!workspace) return <State title="No business workspace" detail="Private deliveries appear here when you join a business workspace." />;
  if (deliveriesQuery.isPending) return <State title="Checking for private file deliveries…" />;
  if (deliveriesQuery.isError) return <State title="Private files couldn’t load" detail={message(deliveriesQuery.error)} retry={() => void deliveriesQuery.refetch()} />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.kicker}>PRIVATE DELIVERY</Text><Text style={styles.title}>Private files</Text><Text style={styles.subtitle}>Files sent directly between members of {workspace.name}.</Text></View>
      </View>
      {workspaces.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {workspaces.map((item) => <Pressable key={item.id} accessibilityState={{ selected: workspace.id === item.id }} onPress={() => setWorkspaceId(item.id)} style={[styles.chip, workspace.id === item.id ? styles.chipActive : null]}><Text style={[styles.chipText, workspace.id === item.id ? styles.chipTextActive : null]}>{item.name}</Text></Pressable>)}
      </ScrollView> : null}
      <View style={styles.viewTabs}>
        <ViewTab label="Received" count={received.length} active={view === "received"} onPress={() => setView("received")} />
        <ViewTab label="Sent" count={sent.length} active={view === "sent"} onPress={() => setView("sent")} />
      </View>
      {downloadError ? <Text accessibilityRole="alert" style={styles.error}>{downloadError}</Text> : null}
      {!visible.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{view === "received" ? "Your private inbox is clear" : "No files sent yet"}</Text>
          <Text style={styles.subtitle}>{view === "received" ? "Files sent directly to you by workspace teammates will appear here." : "Files you send privately to workspace teammates will appear here."}</Text>
        </View>
      ) : visible.map((delivery) => (
        <View key={delivery.id} style={styles.deliveryCard}>
          <View style={[styles.icon, view === "received" ? styles.receivedIcon : styles.sentIcon]}><Text style={styles.iconText}>{view === "received" ? "↓" : "↑"}</Text></View>
          <View style={styles.copy}>
            <Text numberOfLines={2} style={styles.fileName}>{delivery.file.name}</Text>
            <Text style={styles.meta}>{view === "received" ? `From ${delivery.sender.name}` : `To ${delivery.recipient.name}`}</Text>
            <Text style={styles.meta}>{formatBytes(delivery.file.sizeBytes)} · {dateFormat.format(new Date(delivery.createdAt))}</Text>
          </View>
          <Pressable disabled={downloadingId === delivery.id} onPress={() => void download(delivery)} style={styles.downloadButton}>
            <Text style={styles.downloadText}>{downloadingId === delivery.id ? "Opening…" : "Download"}</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.footnote}><Text style={styles.footnoteText}>Files sent to teammates remain private to the sender and intended recipients.</Text></View>
    </ScrollView>
  );
}

function ViewTab({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.tab, active ? styles.tabActive : null]}><Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{label} · {count}</Text></Pressable>;
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <View style={styles.state}>{!detail ? <ActivityIndicator color={colors.green} /> : null}<Text style={styles.fileName}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}{retry ? <Pressable onPress={retry}><Text style={styles.link}>Try again</Text></Pressable> : null}</View>;
}

function formatBytes(value: string): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = -1;
  do { size /= 1024; unitIndex += 1; } while (size >= 1024 && unitIndex < units.length - 1);
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center" },
  headerCopy: { flex: 1, gap: 4 },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  chipRow: { gap: 7 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.greenWash, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  chipTextActive: { color: colors.greenDark },
  viewTabs: { flexDirection: "row", gap: 7, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 6 },
  tab: { flex: 1, borderRadius: 9, alignItems: "center", paddingVertical: 9 },
  tabActive: { backgroundColor: colors.greenWash },
  tabText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  tabTextActive: { color: colors.greenDark },
  deliveryCard: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 10 },
  icon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  receivedIcon: { backgroundColor: colors.greenWash },
  sentIcon: { backgroundColor: colors.sand },
  iconText: { color: colors.greenDark, fontSize: 18, fontWeight: "800" },
  copy: { flex: 1, gap: 3 },
  fileName: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  downloadButton: { backgroundColor: colors.greenWash, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8 },
  downloadText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  empty: { alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 20 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  footnote: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  footnoteText: { color: colors.muted, fontSize: 9, lineHeight: 14, textAlign: "center" },
  error: { color: colors.red, fontSize: 10, lineHeight: 15 },
  link: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 9 },
});
