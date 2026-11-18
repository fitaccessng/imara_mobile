import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { getCaptureEvent, uploadCaptureEventMedia } from "@/public/api";
import { colors } from "@/ui/theme";

export default function CaptureEventRoute() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const query = useQuery({ queryKey: ["event-capture", token], queryFn: () => getCaptureEvent(token), enabled: Boolean(token) });

  async function selectMedia() {
    setError("");
    setStatus("");
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "video/*"], copyToCacheDirectory: true, multiple: true });
      if (result.canceled) return;
      let uploaded = 0;
      for (const asset of result.assets) {
        if (!asset.size || asset.size <= 0) continue;
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const namedBlob = blob as Blob & { name: string };
        namedBlob.name = asset.name;
        await uploadCaptureEventMedia(token, namedBlob);
        uploaded += 1;
      }
      setStatus(uploaded ? `${uploaded} media item${uploaded === 1 ? "" : "s"} uploaded.` : "No valid media was uploaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Media could not be selected.");
    }
  }

  if (!token) return <View style={styles.page}><View style={styles.card}><Text style={styles.error}>No event capture token was found.</Text></View></View>;
  if (query.isPending) return <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.title}>Opening event capture…</Text></View>;
  if (query.isError) return <View style={styles.page}><View style={styles.card}><Text style={styles.title}>Capture unavailable</Text><Text style={styles.subtitle}>{message(query.error)}</Text><Pressable onPress={() => void query.refetch()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Try again</Text></Pressable></View></View>;

  const event = query.data;
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.kicker}>EVENT CAPTURE</Text><Text style={styles.title}>{event.name}</Text>{event.description ? <Text style={styles.subtitle}>{event.description}</Text> : null}<Text style={styles.meta}>{new Date(event.date).toLocaleDateString()}</Text>
        {!event.active ? <Text style={styles.error}>This event is no longer active.</Text> : <><Pressable onPress={() => void selectMedia()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Choose photos or videos</Text></Pressable>{status ? <Text style={styles.success}>{status}</Text> : null}{error ? <Text style={styles.error}>{error}</Text> : null}</>}
      </View>
    </View>
  );
}

function message(error: unknown): string { return error instanceof Error ? error.message : "The capture link may be invalid or expired."; }

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 18, justifyContent: "center" }, state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, card: { gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface, padding: 20 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17 }, meta: { color: colors.muted, fontSize: 9, lineHeight: 14 }, primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800" }, success: { color: colors.greenDark, backgroundColor: colors.greenWash, borderRadius: 9, padding: 9, fontSize: 10 }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 9, fontSize: 10 }, });
