import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { getWebBaseUrl } from "@/config";
import {
  createPersonalFileShare,
  createWorkspaceFileShare,
  getPersonalFileShares,
  getWorkspaceFileShares,
  revokePersonalFileShare,
  revokeWorkspaceFileShare,
} from "@/files/api";
import { colors } from "@/ui/theme";

export function FileShareSheet({
  file,
  workspaceId,
  onClose,
}: {
  file: { id: string; name: string };
  workspaceId?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const links = useQuery({
    queryKey: ["file-shares", workspaceId ?? "personal", file.id],
    queryFn: () => workspaceId ? getWorkspaceFileShares(workspaceId, file.id) : getPersonalFileShares(file.id),
  });
  const createdLink = useMutation({
    mutationFn: async () => {
      const baseUrl = getWebBaseUrl();
      const created = workspaceId
        ? await createWorkspaceFileShare(workspaceId, file.id)
        : await createPersonalFileShare(file.id);
      return `${baseUrl}/share/${encodeURIComponent(created.token)}`;
    },
    onSuccess: async (url) => {
      setShareUrl(url);
      setError("");
      setNotice("");
      await queryClient.invalidateQueries({ queryKey: ["file-shares", workspaceId ?? "personal", file.id] });
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "The share link could not be created."),
  });
  const revokeLink = useMutation({
    mutationFn: (shareId: string) => workspaceId
      ? revokeWorkspaceFileShare(workspaceId, file.id, shareId)
      : revokePersonalFileShare(file.id, shareId),
    onSuccess: async () => {
      setNotice("The public link has been revoked.");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["file-shares", workspaceId ?? "personal", file.id] });
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "The share link could not be revoked."),
  });
  async function shareLink() {
    try {
      await Share.share({ message: shareUrl, title: `Share ${file.name}` });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The system share sheet could not be opened.");
    }
  }

  function confirmRevoke(shareId: string) {
    Alert.alert("Revoke public link?", "Anyone using this link will no longer be able to access the file.", [
      { text: "Cancel", style: "cancel" },
      { text: "Revoke link", style: "destructive", onPress: () => revokeLink.mutate(shareId) },
    ]);
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>PUBLIC ACCESS</Text>
              <Text style={styles.title}>Share this file</Text>
            </View>
            <Pressable accessibilityLabel="Close share options" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          <Text style={styles.description}>{file.name} can be viewed and downloaded by anyone with a public link. Revoke a link at any time.</Text>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {notice ? <Text accessibilityRole="status" style={styles.notice}>{notice}</Text> : null}
          {shareUrl ? (
            <View style={styles.linkCard}>
              <Text style={styles.linkLabel}>New public link · select to copy</Text>
              <Text selectable style={styles.link}>{shareUrl}</Text>
              <Pressable onPress={() => void shareLink()} style={styles.shareButton}><Text style={styles.shareButtonText}>Open system share sheet</Text></Pressable>
              <Text style={styles.warning}>Keep this link private. It grants access without an IMARA account.</Text>
            </View>
          ) : null}
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Existing links</Text>
            <Text style={styles.count}>{links.data?.filter((link) => !link.revokedAt).length ?? 0} active</Text>
          </View>
          {links.isPending ? (
            <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.body}>Loading links…</Text></View>
          ) : links.isError ? (
            <View style={styles.state}><Text style={styles.error}>{links.error instanceof Error ? links.error.message : "Share links could not be loaded."}</Text><Pressable onPress={() => void links.refetch()}><Text style={styles.retry}>Try again</Text></Pressable></View>
          ) : (
            <ScrollView style={styles.linkList}>
              {links.data?.map((link) => (
                <View key={link.id} style={styles.linkRow}>
                  <View style={styles.linkInfo}>
                    <Text style={styles.linkName}>{link.revokedAt ? "Revoked link" : "Active public link"}</Text>
                    <Text style={styles.body}>Created {formatDate(link.createdAt)}</Text>
                  </View>
                  {!link.revokedAt ? <Pressable accessibilityLabel="Revoke public link" onPress={() => confirmRevoke(link.id)} style={styles.revoke}><Text style={styles.revokeText}>Revoke</Text></Pressable> : null}
                </View>
              ))}
              {!links.data?.length ? <Text style={styles.body}>No public links have been created for this file.</Text> : null}
            </ScrollView>
          )}
          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>Close</Text></Pressable>
            <Pressable disabled={createdLink.isPending} onPress={() => { setError(""); setNotice(""); createdLink.mutate(); }} style={[styles.primary, createdLink.isPending ? styles.disabled : null]}>
              <Text style={styles.primaryText}>{createdLink.isPending ? "Creating…" : "Create public link"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12, 31, 24, 0.42)" },
  sheet: { maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24, gap: 12 },
  grabber: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: "center", marginBottom: 3 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headingCopy: { gap: 5 },
  eyebrow: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700" },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.ink, fontSize: 25, lineHeight: 28 },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.red, fontSize: 13, lineHeight: 18 },
  notice: { color: colors.greenDark, fontSize: 13, lineHeight: 18 },
  linkCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 9, borderWidth: 1, borderColor: colors.line },
  linkLabel: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  link: { color: colors.greenDark, fontSize: 12, lineHeight: 18 },
  warning: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  shareButton: { backgroundColor: colors.greenWash, alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  shareButtonText: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  sectionTitle: { color: colors.ink, fontWeight: "700", fontSize: 15 },
  count: { color: colors.muted, fontSize: 12 },
  linkList: { maxHeight: 185 },
  linkRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 10, gap: 10 },
  linkInfo: { flex: 1, gap: 4 },
  linkName: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  revoke: { paddingHorizontal: 10, paddingVertical: 8 },
  revokeText: { color: colors.red, fontSize: 12, fontWeight: "700" },
  state: { alignItems: "center", padding: 14, gap: 8 },
  retry: { color: colors.greenDark, fontSize: 13, fontWeight: "700" },
  footer: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 4 },
  secondary: { flex: 1, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingVertical: 13, alignItems: "center" },
  secondaryText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  primary: { flex: 1.5, borderRadius: 13, backgroundColor: colors.green, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: colors.surface, fontWeight: "700", fontSize: 13 },
  disabled: { opacity: 0.6 },
});
