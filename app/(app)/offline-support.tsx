import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { File } from "expo-file-system";

import { ApiError, apiRequest } from "@/api/client";
import { useAuthStore } from "@/auth/auth-store";
import { removePendingScan, listPendingScans, type PendingScan } from "@/offline/scan-queue";
import { Notice, TextLink } from "@/ui/components";
import { colors } from "@/ui/theme";

async function uploadQueuedScan(scan: PendingScan): Promise<void> {
  const form = new FormData();
  form.append("file", new File(scan.uri), scan.fileName);
  await apiRequest("/files/scan", { method: "POST", body: form });
  await removePendingScan(scan);
}

export default function OfflineSupportScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const netInfo = useNetInfo();
  const queryClient = useQueryClient();
  const scans = useQuery({
    queryKey: ["offline", "pending-scans", userId],
    queryFn: () => listPendingScans(userId!),
    enabled: Boolean(userId),
  });
  const syncScans = useMutation({
    mutationFn: async (pending: PendingScan[]) => {
      for (const scan of pending) {
        await uploadQueuedScan(scan);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["offline", "pending-scans", userId] }),
  });

  useEffect(() => {
    if (netInfo.isConnected === true && userId) {
      void queryClient.invalidateQueries({ queryKey: ["offline", "pending-scans", userId] });
    }
  }, [netInfo.isConnected, queryClient, userId]);

  const online = netInfo.isConnected === true;
  const pendingCount = scans.data?.length ?? 0;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>OFFLINE SUPPORT</Text>
        <Text style={styles.title}>Local capture queue</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={[styles.statusDot, online ? styles.onlineDot : styles.offlineDot]} />
        <View style={styles.networkCopy}>
          <Text style={styles.summaryTitle}>Network</Text>
          <Text style={styles.summaryValue}>{online ? "Connected" : netInfo.isConnected === false ? "Offline" : "Checking…"}</Text>
        </View>
      </View>

      {scans.isError ? <Notice>{scans.error instanceof Error ? scans.error.message : "Could not read the local scan queue."}</Notice> : null}
      {syncScans.isError ? (
        <Notice>
          {syncScans.error instanceof ApiError
            ? syncScans.error.message
            : syncScans.error instanceof Error
              ? syncScans.error.message
              : "Could not sync queued scans."}
        </Notice>
      ) : null}
      {scans.isPending ? <Text style={styles.muted}>Checking local queue…</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending document scans</Text>
        <Text style={styles.cardDetail}>
          {pendingCount === 1 ? "1 scan is stored on this device." : `${pendingCount} scans are stored on this device.`}
        </Text>
        {pendingCount > 0 && online ? (
          <Pressable
            accessibilityRole="button"
            disabled={syncScans.isPending}
            onPress={() => syncScans.mutate(scans.data ?? [])}
            style={styles.action}
          >
            <Text style={styles.actionText}>{syncScans.isPending ? "Uploading…" : "Upload pending scans"}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.noticeCard}>
        <Text style={styles.cardTitle}>Permission safety</Text>
        <Text style={styles.cardDetail}>
          IMARA checks access on the server when a scan uploads. Offline scans stay private in this app’s storage and are not treated as proof of workspace access.
        </Text>
      </View>
      <Text style={styles.disclaimer}>
        Offline document downloads and automatic background uploads are not yet supported by the current API contract.
      </Text>

      <Link href="/(app)/scan" asChild>
        <Pressable style={styles.action}><Text style={styles.actionText}>Scan a document</Text></Pressable>
      </Link>
      <Link href="/(app)/communications" asChild>
        <Pressable><Text style={styles.link}>Back to communications</Text></Pressable>
      </Link>
      <TextLink title="Refresh queue" onPress={() => void scans.refetch()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 14 },
  header: { gap: 8, marginBottom: 4 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.5 },
  summaryCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 18 },
  statusDot: { width: 11, height: 11, borderRadius: 6 },
  onlineDot: { backgroundColor: colors.green },
  offlineDot: { backgroundColor: colors.red },
  networkCopy: { gap: 4 },
  summaryTitle: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  summaryValue: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 },
  noticeCard: { backgroundColor: colors.greenWash, borderRadius: 18, padding: 16, gap: 8 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  cardDetail: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  action: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center" },
  actionText: { color: colors.surface, fontSize: 13, fontWeight: "700" },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  link: { color: colors.greenDark, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: 8 },
});
