import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getPublicGallery, unlockPublicGallery } from "@/public/api";
import { colors } from "@/ui/theme";

export default function GalleryRoute() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [passcode, setPasscode] = useState("");
  const [authorization, setAuthorization] = useState("");
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["public-gallery", token, authorization],
    queryFn: () => getPublicGallery(token, authorization || undefined),
    enabled: Boolean(token),
  });

  const unlock = useMutation({
    mutationFn: () => {
      if (passcode.length < 8) throw new Error("Enter the 8-character gallery passcode.");
      return unlockPublicGallery(token, passcode);
    },
    onSuccess: (result) => { setAuthorization(result.authorization); setPasscode(""); setError(""); },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The gallery could not be unlocked."),
  });

  if (!token) return <View style={styles.page}><View style={styles.card}><Text style={styles.error}>No gallery token was found.</Text></View></View>;
  if (query.isPending) return <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.title}>Opening gallery…</Text></View>;
  if (query.isError) return <View style={styles.page}><View style={styles.card}><Text style={styles.title}>Gallery unavailable</Text><Text style={styles.subtitle}>{message(query.error)}</Text><Pressable onPress={() => void query.refetch()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Try again</Text></Pressable></View></View>;

  const gallery = query.data;
  if (gallery.authorizationRequired || gallery.protected) {
    return (
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.kicker}>PRIVATE GALLERY</Text><Text style={styles.title}>{gallery.name}</Text><Text style={styles.subtitle}>Enter the event passcode to view or download media.</Text>
          <Text style={styles.label}>Passcode</Text><TextInput secureTextEntry value={passcode} onChangeText={setPasscode} placeholder="Gallery passcode" placeholderTextColor={colors.muted} style={styles.input} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={unlock.isPending} onPress={() => unlock.mutate()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{unlock.isPending ? "Unlocking…" : "Unlock gallery"}</Text></Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.card}>
        <Text style={styles.kicker}>EVENT GALLERY</Text><Text style={styles.title}>{gallery.name}</Text>
        {!gallery.media?.length ? <Text style={styles.subtitle}>No media has been uploaded yet.</Text> : gallery.media.map((item) => <View key={item.id} style={styles.mediaRow}><View style={styles.mediaCopy}><Text numberOfLines={1} style={styles.mediaName}>{item.name}</Text><Text style={styles.meta}>{item.mimeType} · {formatBytes(item.sizeBytes)}</Text></View></View>)}
      </View>
    </ScrollView>
  );
}

function formatBytes(value: string): string { const bytes = Number(value); if (!Number.isFinite(bytes) || bytes < 0) return "—"; if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 ** 2).toFixed(1)} MB`; }
function message(error: unknown): string { return error instanceof Error ? error.message : "The link may be invalid or expired."; }

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 18, justifyContent: "center" }, pageContent: { flexGrow: 1, backgroundColor: colors.background, padding: 18 }, state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, card: { gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface, padding: 20 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17 }, label: { color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 2 }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.background, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 }, primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800" }, mediaRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 9 }, mediaCopy: { gap: 2 }, mediaName: { color: colors.text, fontSize: 11, fontWeight: "700" }, meta: { color: colors.muted, fontSize: 9, lineHeight: 14 }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 9, fontSize: 10 }, });
