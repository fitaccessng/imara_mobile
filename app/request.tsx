import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { getPublicFileRequest, uploadPublicFileRequest } from "@/public/api";
import { colors } from "@/ui/theme";

export default function PublicFileRequestRoute() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const query = useQuery({ queryKey: ["public-file-request", token], queryFn: () => getPublicFileRequest(token), enabled: Boolean(token) });

  const upload = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) throw new Error("No file was selected.");
      const asset = result.assets[0];
      const size = asset.size ?? 0;
      if (size <= 0) throw new Error("The selected file is empty.");
      if (query.data && size > Number(query.data.maxUploadBytes)) throw new Error("The selected file exceeds this request’s upload limit.");
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const namedBlob = blob as Blob & { name: string };
      namedBlob.name = asset.name;
      return uploadPublicFileRequest(token, namedBlob);
    },
    onSuccess: () => setSuccess("File uploaded successfully."),
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Upload could not be started."),
  });

  if (!token) return <View style={styles.page}><View style={styles.card}><Text style={styles.error}>No file-request token was found.</Text></View></View>;
  if (query.isPending) return <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.title}>Opening file request…</Text></View>;
  if (query.isError) return <View style={styles.page}><View style={styles.card}><Text style={styles.title}>File request unavailable</Text><Text style={styles.subtitle}>{message(query.error)}</Text><Pressable onPress={() => void query.refetch()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Try again</Text></Pressable></View></View>;

  const request = query.data;
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.kicker}>PUBLIC FILE REQUEST</Text><Text style={styles.title}>{request.title}</Text>{request.message ? <Text style={styles.subtitle}>{request.message}</Text> : null}<Text style={styles.meta}>Requested by {request.ownerName}{request.destinationFolderName ? ` · ${request.destinationFolderName}` : ""}</Text><Text style={styles.meta}>Maximum upload: {formatBytes(request.maxUploadBytes)}</Text>
        {!request.active ? <Text style={styles.error}>This file request is no longer active.</Text> : <><Pressable disabled={upload.isPending} onPress={() => { setError(""); setSuccess(""); upload.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{upload.isPending ? "Opening…" : "Choose and upload file"}</Text></Pressable>{success ? <Text style={styles.success}>{success}</Text> : null}{error ? <Text style={styles.error}>{error}</Text> : null}</>}
      </View>
    </View>
  );
}

function formatBytes(value: string): string { const bytes = Number(value); if (!Number.isFinite(bytes) || bytes < 0) return "—"; if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 ** 2).toFixed(1)} MB`; }
function message(error: unknown): string { return error instanceof Error ? error.message : "The link may be invalid or revoked."; }

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 18, justifyContent: "center" }, state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, card: { gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface, padding: 20 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17 }, meta: { color: colors.muted, fontSize: 9, lineHeight: 14 }, primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800" }, success: { color: colors.greenDark, backgroundColor: colors.greenWash, borderRadius: 9, padding: 9, fontSize: 10 }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 9, fontSize: 10 }, });
