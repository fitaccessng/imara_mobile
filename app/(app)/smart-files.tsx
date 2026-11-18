import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import * as Sharing from "expo-sharing";
import { File as LocalFile } from "expo-file-system";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BrandMark } from "@/ui/components";
import { downloadPersonalFile } from "@/files/download";
import {
  getDuplicateFiles,
  getSmartLibrary,
  updatePersonalFileOrganization,
  type DuplicateGroup,
  type SmartFile,
  type SmartFileCategory,
} from "@/files/api";
import { colors } from "@/ui/theme";

const categories: { key: SmartFileCategory | "ALL"; label: string }[] = [
  { key: "ALL", label: "Everything" },
  { key: "FINANCE", label: "Finance" },
  { key: "CONTRACTS", label: "Contracts" },
  { key: "HUMAN_RESOURCES", label: "People" },
  { key: "OPERATIONS", label: "Operations" },
  { key: "PERSONAL", label: "Personal" },
  { key: "OTHER", label: "Unsorted" },
];

export default function SmartFilesScreen() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"library" | "duplicates">("library");
  const [category, setCategory] = useState<SmartFileCategory | "ALL">("ALL");
  const [selectedFile, setSelectedFile] = useState<SmartFile | null>(null);
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const library = useQuery({ queryKey: ["smart-library"], queryFn: getSmartLibrary });
  const duplicates = useQuery({ queryKey: ["smart-duplicates"], queryFn: getDuplicateFiles });
  const updateOrganization = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { category?: SmartFileCategory; tags?: string[] } }) =>
      updatePersonalFileOrganization(id, changes),
    onSuccess: async (_result, { changes }) => {
      await queryClient.invalidateQueries({ queryKey: ["smart-library"] });
      setSelectedFile(null);
      setNotice(changes.tags ? "Tags updated." : "Category updated.");
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "The file could not be updated."),
  });
  const files = library.data ?? [];
  const filteredFiles = useMemo(
    () => files.filter((file) => category === "ALL" || file.category === category),
    [files, category],
  );
  const totalSize = files.reduce((total, file) => total + Number(file.sizeBytes), 0);
  const duplicateCount = (duplicates.data ?? []).reduce((total, group) => total + group.files.length, 0);

  async function saveTags(file: SmartFile) {
    const tags = (tagDrafts[file.id] ?? file.tags.join(",")).split(",").map((tag) => tag.trim()).filter(Boolean);
    if (tags.length > 20 || tags.some((tag) => tag.length > 40)) {
      setNotice("Use up to 20 tags, each no longer than 40 characters.");
      return;
    }
    updateOrganization.mutate({ id: file.id, changes: { tags } });
  }

  async function downloadFile(file: Pick<SmartFile, "id" | "name" | "mimeType">, preview: boolean) {
    setDownloadError("");
    setDownloadingId(file.id);
    try {
      const localFile = await downloadPersonalFile(file);
      if (preview) {
        if (await LocalFile.canPreview(localFile, { mimeType: file.mimeType })) {
          await localFile.preview({ title: file.name, mimeType: file.mimeType });
        } else {
          setDownloadError(`${file.name} was downloaded, but this device cannot preview its file type.`);
        }
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localFile.uri, { mimeType: file.mimeType, dialogTitle: file.name });
      } else {
        setDownloadError(`${file.name} was saved in IMARA's device storage.`);
      }
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "The file could not be downloaded.");
    } finally {
      setDownloadingId("");
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.kicker}>FILE INTELLIGENCE</Text><Text style={styles.title}>Smart library</Text></View>
        <BrandMark />
      </View>
      <Text style={styles.subtitle}>Files are grouped by their details. Exact duplicates are surfaced for review, never removed automatically.</Text>
      {library.isPending ? (
        <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.body}>Organizing your library…</Text></View>
      ) : library.isError ? (
        <View style={styles.state}><Text style={styles.cardTitle}>Your library couldn’t load</Text><Text style={styles.body}>{library.error instanceof Error ? library.error.message : "Please try again."}</Text><Pressable onPress={() => void library.refetch()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="READY FILES" value={String(files.length)} />
            <Stat label="SPACE IN USE" value={formatBytes(totalSize)} />
            <Stat label="EXACT MATCHES" value={String(duplicateCount)} />
          </View>
          {notice ? <Text accessibilityRole="status" style={styles.notice}>{notice}</Text> : null}
          {downloadError ? <Text accessibilityRole="alert" style={styles.error}>{downloadError}</Text> : null}
          <View style={styles.tabs}>
            <Pressable onPress={() => setView("library")} style={[styles.tab, view === "library" ? styles.tabSelected : null]}><Text style={[styles.tabText, view === "library" ? styles.tabTextSelected : null]}>Library</Text></Pressable>
            <Pressable onPress={() => setView("duplicates")} style={[styles.tab, view === "duplicates" ? styles.tabSelected : null]}><Text style={[styles.tabText, view === "duplicates" ? styles.tabTextSelected : null]}>Duplicates</Text></Pressable>
          </View>
          {view === "library" ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                {categories.map((item) => (
                  <Pressable key={item.key} onPress={() => setCategory(item.key)} style={[styles.filter, category === item.key ? styles.filterSelected : null]}>
                    <Text style={[styles.filterText, category === item.key ? styles.filterTextSelected : null]}>{item.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.list}>
                {filteredFiles.map((file) => (
                  <View key={file.id} style={styles.card}>
                    <View style={styles.fileHeader}>
                      <View style={styles.fileGlyph}><Text style={styles.fileGlyphText}>{file.mimeType.split("/").at(-1)?.slice(0, 4).toUpperCase() ?? "FILE"}</Text></View>
                      <View style={styles.fileCopy}>
                        <Text numberOfLines={1} style={styles.cardTitle}>{file.name}</Text>
                        <Text style={styles.body}>{file.folder?.name ?? "My files"} · {formatBytes(Number(file.sizeBytes))}</Text>
                      </View>
                    </View>
                    <View style={styles.metadata}>
                      <Text style={styles.metaLabel}>CATEGORY</Text>
                      <Pressable accessibilityRole="button" onPress={() => setSelectedFile(file)} style={styles.categoryChip}>
                        <Text style={styles.categoryText}>{categoryLabel(file.category)}  ›</Text>
                      </Pressable>
                      <Text style={styles.updated}>Updated {formatDate(file.updatedAt)}</Text>
                    </View>
                    <View style={styles.tagRow}>
                      {file.tags.length ? file.tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>) : <Text style={styles.body}>No tags</Text>}
                    </View>
                    <View style={styles.actions}>
                      <Pressable disabled={Boolean(downloadingId)} onPress={() => void downloadFile(file, true)} style={styles.textAction}>
                        <Text style={styles.textActionLabel}>{downloadingId === file.id ? "Opening…" : "Preview"}</Text>
                      </Pressable>
                      <Pressable disabled={Boolean(downloadingId)} onPress={() => void downloadFile(file, false)} style={styles.textAction}>
                        <Text style={styles.textActionLabel}>Download</Text>
                      </Pressable>
                      <Pressable onPress={() => setSelectedFile(file)} style={styles.textAction}>
                        <Text style={styles.textActionLabel}>Edit tags</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                {!filteredFiles.length ? <EmptyState title={files.length ? "No files in this category" : "Your library is waiting"} detail={files.length ? "Choose another category to see more files." : "Upload a document and IMARA will organize it from its name and file type."} /> : null}
              </View>
            </>
          ) : (
            <View style={styles.list}>
              {duplicates.isPending ? <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.body}>Checking exact matches…</Text></View> : null}
              {duplicates.isError ? <View style={styles.state}><Text style={styles.error}>{duplicates.error instanceof Error ? duplicates.error.message : "Duplicate groups could not load."}</Text><Pressable onPress={() => void duplicates.refetch()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View> : null}
              {duplicates.data?.map((group) => <DuplicateCard key={group.contentHash} group={group} />)}
              {duplicates.data?.length === 0 ? <EmptyState title="No exact duplicates found" detail="New uploads are compared by a cryptographic content fingerprint." /> : null}
              <Text style={styles.body}>Files are never deleted automatically. Review and remove any unwanted copies from your library.</Text>
            </View>
          )}
        </>
      )}
      <Link href="/(app)/files" asChild><Pressable style={styles.back}><Text style={styles.backText}>Back to files</Text></Pressable></Link>
      <Modal animationType="slide" onRequestClose={() => setSelectedFile(null)} transparent visible={Boolean(selectedFile)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editor}>
            <View style={styles.grabber} />
            <Text style={styles.kicker}>FILE ORGANIZATION</Text>
            <Text numberOfLines={1} style={styles.editorTitle}>{selectedFile?.name}</Text>
            <Text style={styles.label}>Choose a category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {categories.filter((item) => item.key !== "ALL").map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityState={{ selected: selectedFile?.category === item.key }}
                  onPress={() => selectedFile && updateOrganization.mutate({ id: selectedFile.id, changes: { category: item.key as SmartFileCategory } })}
                  style={[styles.filter, selectedFile?.category === item.key ? styles.filterSelected : null]}
                >
                  <Text style={[styles.filterText, selectedFile?.category === item.key ? styles.filterTextSelected : null]}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.label}>Tags · comma separated</Text>
            <TextInput
              onChangeText={(text) => selectedFile && setTagDrafts((drafts) => ({ ...drafts, [selectedFile.id]: text }))}
              placeholder="e.g. quarterly, board"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={selectedFile ? tagDrafts[selectedFile.id] ?? selectedFile.tags.join(", ") : ""}
            />
            <View style={styles.footer}>
              <Pressable onPress={() => setSelectedFile(null)} style={styles.secondary}><Text style={styles.secondaryText}>Close</Text></Pressable>
              <Pressable disabled={updateOrganization.isPending} onPress={() => selectedFile && void saveTags(selectedFile)} style={styles.primary}>
                <Text style={styles.primaryText}>{updateOrganization.isPending ? "Saving…" : "Save tags"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text numberOfLines={1} style={styles.statValue}>{value}</Text></View>;
}

function DuplicateCard({ group }: { group: DuplicateGroup }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{group.files.length} identical files</Text>
      <Text style={styles.fingerprint}>SHA-256 · {group.contentHash.slice(0, 12)}…</Text>
      {group.files.map((file) => (
        <View key={file.id} style={styles.duplicateRow}>
          <Text numberOfLines={1} style={styles.cardTitle}>{file.name}</Text>
          <Text style={styles.body}>{formatBytes(Number(file.sizeBytes))} · {formatDate(file.createdAt)}</Text>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <View style={styles.empty}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.body}>{detail}</Text></View>;
}

function categoryLabel(category: SmartFileCategory): string {
  return categories.find((item) => item.key === category)?.label ?? "Unsorted";
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "Size unavailable";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = bytes / 1024;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) { amount /= 1024; unitIndex += 1; }
  return `${amount.toFixed(amount < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 22, paddingTop: 20, paddingBottom: 36, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 13, borderColor: colors.line, borderWidth: 1, padding: 11, gap: 7 },
  statLabel: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 0.6 },
  statValue: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  notice: { color: colors.greenDark, fontSize: 13 },
  error: { color: colors.red, fontSize: 13, lineHeight: 18 },
  tabs: { flexDirection: "row", backgroundColor: colors.surface, padding: 4, borderRadius: 13, borderWidth: 1, borderColor: colors.line },
  tab: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  tabSelected: { backgroundColor: colors.greenWash },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  tabTextSelected: { color: colors.greenDark },
  filters: { gap: 7, paddingVertical: 2 },
  filter: { backgroundColor: colors.surface, borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 11, paddingVertical: 8 },
  filterSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  filterTextSelected: { color: colors.greenDark },
  list: { gap: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 17, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 },
  fileHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  fileGlyph: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.greenWash, alignItems: "center", justifyContent: "center" },
  fileGlyphText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  fileCopy: { flex: 1, gap: 4 },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  metadata: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metaLabel: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 0.7 },
  categoryChip: { backgroundColor: colors.greenWash, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  categoryText: { color: colors.greenDark, fontSize: 10, fontWeight: "700" },
  updated: { color: colors.muted, fontSize: 10, marginLeft: "auto" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { color: colors.text, backgroundColor: colors.background, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10 },
  actions: { flexDirection: "row", gap: 16, borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 8 },
  textAction: { paddingVertical: 5 },
  textActionLabel: { color: colors.greenDark, fontSize: 11, fontWeight: "700" },
  state: { alignItems: "center", padding: 24, gap: 10 },
  retry: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  retryText: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  empty: { borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 22, alignItems: "center", gap: 8 },
  duplicateRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9, gap: 4 },
  fingerprint: { color: colors.muted, fontSize: 10, letterSpacing: 0.4 },
  back: { backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  backText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12, 31, 24, 0.42)" },
  editor: { backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 11, paddingBottom: 26, gap: 13 },
  grabber: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: "center", marginBottom: 3 },
  editorTitle: { color: colors.ink, fontSize: 19, fontWeight: "700" },
  label: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 13, paddingVertical: 12, color: colors.ink, fontSize: 14 },
  footer: { flexDirection: "row", gap: 10 },
  secondary: { flex: 1, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingVertical: 13, alignItems: "center" },
  secondaryText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  primary: { flex: 1.5, borderRadius: 13, backgroundColor: colors.green, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: colors.surface, fontWeight: "700", fontSize: 13 },
});
