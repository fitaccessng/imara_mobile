import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import * as Sharing from "expo-sharing";
import { File as LocalFile } from "expo-file-system";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BrandMark } from "@/ui/components";
import { colors } from "@/ui/theme";
import { downloadPersonalFile } from "@/files/download";
import { searchPersonalFiles, type PersonalFile } from "@/files/api";

export default function FileSearchScreen() {
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState("");
  const [workingFile, setWorkingFile] = useState("");
  const term = query.trim();
  const results = useQuery({
    queryKey: ["personal-file-search", term],
    queryFn: () => searchPersonalFiles(term),
    enabled: term.length > 0,
  });

  async function handleFile(file: PersonalFile, preview: boolean) {
    setActionError("");
    setWorkingFile(file.id);
    try {
      const localFile = await downloadPersonalFile(file);
      if (preview) {
        if (await LocalFile.canPreview(localFile, { mimeType: file.mimeType })) {
          await localFile.preview({ title: file.name, mimeType: file.mimeType });
        } else {
          setActionError(`${file.name} was downloaded, but this device cannot preview its file type.`);
        }
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localFile.uri, { mimeType: file.mimeType, dialogTitle: file.name });
      } else {
        setActionError(`${file.name} was saved in IMARA's device storage.`);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The file could not be opened.");
    } finally {
      setWorkingFile("");
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} style={styles.screen}>
      <View style={styles.header}><View><Text style={styles.kicker}>YOUR LIBRARY</Text><Text style={styles.title}>Search files</Text></View><BrandMark /></View>
      <TextInput
        accessibilityLabel="Search files and folders"
        autoCapitalize="none"
        onChangeText={setQuery}
        placeholder="Search names or document text"
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        style={styles.input}
        value={query}
      />
      {!term ? <Text style={styles.info}>Search file and folder names, or text indexed from your documents.</Text> : null}
      {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
      {results.isFetching ? <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.info}>Searching…</Text></View> : null}
      {results.isError ? (
        <View style={styles.state}><Text style={styles.error}>{results.error instanceof Error ? results.error.message : "Search failed."}</Text><Pressable onPress={() => void results.refetch()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>
      ) : null}
      {results.data ? (
        <View style={styles.list}>
          {!results.data.files.length && !results.data.folders.length ? <Text style={styles.info}>No matching files or folders.</Text> : null}
          {results.data.folders.map((folder) => (
            <Link key={folder.id} href={{ pathname: "/(app)/files", params: { folderId: folder.id, folderName: folder.name } }} asChild>
              <Pressable style={styles.row}>
                <Text style={styles.icon}>▰</Text><View style={styles.copy}><Text style={styles.name}>{folder.name}</Text><Text style={styles.info}>Folder · Open</Text></View>
              </Pressable>
            </Link>
          ))}
          {results.data.files.map((file) => (
            <View key={file.id} style={styles.row}>
              <Text style={styles.icon}>▤</Text>
              <Pressable disabled={Boolean(workingFile)} onPress={() => void handleFile(file, true)} style={styles.copy}>
                <Text numberOfLines={1} style={styles.name}>{file.name}</Text>
                <Text style={styles.info}>{file.mimeType} · {formatDate(file.createdAt)}</Text>
              </Pressable>
              <Pressable accessibilityLabel={`Download ${file.name}`} disabled={Boolean(workingFile)} onPress={() => void handleFile(file, false)} style={styles.download}>
                <Text style={styles.downloadText}>{workingFile === file.id ? "…" : "Save"}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <Link href="/(app)/files" asChild><Pressable style={styles.back}><Text style={styles.backText}>Back to files</Text></Pressable></Link>
    </ScrollView>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", marginTop: 6 },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: colors.ink, fontSize: 15 },
  info: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.red, fontSize: 13, textAlign: "center" },
  list: { gap: 9 },
  row: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { color: colors.green, fontSize: 20 },
  copy: { flex: 1, gap: 4 },
  name: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  download: { backgroundColor: colors.greenWash, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  downloadText: { color: colors.greenDark, fontSize: 11, fontWeight: "700" },
  state: { alignItems: "center", padding: 20, gap: 8 },
  retry: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  retryText: { color: colors.greenDark, fontSize: 13, fontWeight: "700" },
  back: { backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  backText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
});
