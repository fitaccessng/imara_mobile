import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { getPublicSharedFile, getPublicSharedFileDownloadUrl } from "@/public/api";
import { colors } from "@/ui/theme";

export default function SharedFileRoute() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["public-share", token],
    queryFn: () => getPublicSharedFile(token),
    enabled: Boolean(token),
  });

  if (!token) return <View style={styles.page}><View style={styles.card}><Text style={styles.error}>No shared-file token was found in this link.</Text></View></View>;
  if (query.isPending) return <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.title}>Opening shared file…</Text></View>;
  if (query.isError) return <View style={styles.page}><View style={styles.card}><Text style={styles.title}>This shared file is unavailable</Text><Text style={styles.subtitle}>{errorMessage(query.error)}</Text><Pressable onPress={() => void query.refetch()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Try again</Text></Pressable></View></View>;

  const file = query.data;
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.kicker}>PUBLIC FILE SHARING</Text>
        <Text style={styles.title}>{file.name}</Text>
        <Text style={styles.subtitle}>{file.mimeType} · {formatBytes(file.sizeBytes)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={() => { setError(""); void Linking.openURL(getPublicSharedFileDownloadUrl(token)).catch((cause) => setError(cause instanceof Error ? cause.message : "The download could not be opened.")); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Download file</Text></Pressable>
      </View>
    </View>
  );
}

function formatBytes(value: string): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : "The link may be invalid or revoked."; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: 18, justifyContent: "center" }, state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, card: { gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface, padding: 20 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17 }, primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800" }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 9, fontSize: 10 },
});
