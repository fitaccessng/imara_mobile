import { File as LocalFile } from "expo-file-system";
import { Link, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as Sharing from "expo-sharing";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BrandMark } from "@/ui/components";
import { colors } from "@/ui/theme";
import {
  createPersonalFolder,
  getPersonalFiles,
  movePersonalFileToTrash,
  setPersonalFileFavorite,
  uploadPersonalFile,
  type PersonalFile,
  type PersonalFolder,
} from "@/files/api";
import { downloadPersonalFile } from "@/files/download";
import { FileShareSheet } from "@/files/share-sheet";
import { FolderActionSheet } from "@/files/folder-action-sheet";

export default function FilesScreen() {
  const routeFolder = useLocalSearchParams<{ folderId?: string; folderName?: string }>();
  const queryClient = useQueryClient();
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>(() =>
    routeFolder.folderId && routeFolder.folderName ? [{ id: routeFolder.folderId, name: routeFolder.folderName }] : [],
  );
  const [folderName, setFolderName] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedFile, setSelectedFile] = useState<PersonalFile | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<PersonalFolder | null>(null);
  const [sharingFile, setSharingFile] = useState<PersonalFile | null>(null);
  const [downloadingFile, setDownloadingFile] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<{ written: number; total: number } | null>(null);
  const folderId = folderStack.at(-1)?.id ?? null;
  useEffect(() => {
    if (routeFolder.folderId && routeFolder.folderName) {
      setFolderStack([{ id: routeFolder.folderId, name: routeFolder.folderName }]);
    }
  }, [routeFolder.folderId, routeFolder.folderName]);
  const listing = useQuery({
    queryKey: ["personal-files", folderId],
    queryFn: () => getPersonalFiles(folderId),
  });
  const refreshFiles = async () => {
    await queryClient.invalidateQueries({ queryKey: ["personal-files"] });
    await queryClient.invalidateQueries({ queryKey: ["personal-file-collections"] });
    await queryClient.invalidateQueries({ queryKey: ["personal-file-search"] });
    await queryClient.invalidateQueries({ queryKey: ["personal-folder-favorites"] });
  };
  const createFolder = useMutation({
    mutationFn: () => createPersonalFolder(folderName.trim(), folderId),
    onSuccess: async () => {
      setFolderName("");
      setFormError("");
      await refreshFiles();
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "Could not create this folder."),
  });
  const uploadFile = useMutation({
    mutationFn: ({ file }: { file: LocalFile }) => uploadPersonalFile(file, folderId),
    onSuccess: refreshFiles,
    onError: (error) => setFormError(error instanceof Error ? error.message : "Could not upload this file."),
  });
  const toggleFavorite = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => setPersonalFileFavorite(id, value),
    onSuccess: refreshFiles,
    onError: (error) => setFormError(error instanceof Error ? error.message : "Could not update this file."),
  });
  const trashFile = useMutation({
    mutationFn: movePersonalFileToTrash,
    onSuccess: refreshFiles,
    onError: (error) => setFormError(error instanceof Error ? error.message : "Could not move this file to the Recycle Bin."),
  });

  async function pickAndUploadFile() {
    setFormError("");
    try {
      const picked = await LocalFile.pickFileAsync();
      if (!picked.canceled) uploadFile.mutate({ file: picked.result });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The file picker could not be opened.");
    }
  }

  async function openDownloadedFile(file: PersonalFile, preview: boolean) {
    setFormError("");
    setDownloadingFile(file.id);
    setDownloadProgress(null);
    try {
      const localFile = await downloadPersonalFile(file, (written, total) => setDownloadProgress({ written, total }));
      if (preview) {
        if (await LocalFile.canPreview(localFile, { mimeType: file.mimeType })) {
          await localFile.preview({ title: file.name, mimeType: file.mimeType });
        } else {
          Alert.alert("File downloaded", `${file.name} is saved in IMARA's device storage, but this device cannot preview its file type.`);
        }
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localFile.uri, { mimeType: file.mimeType, dialogTitle: file.name });
      } else {
        Alert.alert("File downloaded", `${file.name} is saved in IMARA's device storage.`);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The file could not be downloaded.");
    } finally {
      setDownloadingFile("");
      setDownloadProgress(null);
    }
  }

  function confirmTrash(id: string, name: string) {
    Alert.alert("Move to Recycle Bin?", `${name} can be restored later from the Recycle Bin.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Move to Bin", style: "destructive", onPress: () => trashFile.mutate(id) },
    ]);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>PERSONAL FILES</Text>
          <Text style={styles.title}>{folderStack.at(-1)?.name ?? "Your files"}</Text>
        </View>
        <BrandMark />
      </View>

      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" onPress={pickAndUploadFile} style={styles.primaryAction} disabled={uploadFile.isPending}>
          <Text style={styles.primaryActionText}>{uploadFile.isPending ? "Uploading…" : "Upload file"}</Text>
        </Pressable>
        <Link href="/(app)/file-search" asChild>
          <Pressable style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Search</Text></Pressable>
        </Link>
      </View>

      <View style={styles.collectionLinks}>
        <Link href="/(app)/smart-files" asChild>
          <Pressable style={styles.collectionLink}><Text style={styles.collectionLinkText}>Smart library</Text></Pressable>
        </Link>
        <Link href="/(app)/file-favorites" asChild>
          <Pressable style={styles.collectionLink}><Text style={styles.collectionLinkText}>Favourites</Text></Pressable>
        </Link>
        <Link href="/(app)/file-trash" asChild>
          <Pressable style={styles.collectionLink}><Text style={styles.collectionLinkText}>Recycle Bin</Text></Pressable>
        </Link>
      </View>

      <View style={styles.createFolder}>
        <TextInput
          accessibilityLabel="New folder name"
          onChangeText={setFolderName}
          placeholder="New folder name"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={folderName}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!folderName.trim() || createFolder.isPending}
          onPress={() => createFolder.mutate()}
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>Create folder</Text>
        </Pressable>
      </View>

      {folderStack.length > 0 && (
        <Pressable accessibilityRole="button" onPress={() => setFolderStack((stack) => stack.slice(0, -1))} style={styles.backFolder}>
          <Text style={styles.backFolderText}>‹  Back to {folderStack.length > 1 ? folderStack.at(-2)?.name : "Your files"}</Text>
        </Pressable>
      )}

      {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
      {listing.isPending ? (
        <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.stateText}>Loading your files…</Text></View>
      ) : listing.isError ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Files couldn’t load</Text>
          <Text style={styles.stateText}>{listing.error instanceof Error ? listing.error.message : "Please try again."}</Text>
          <Pressable onPress={() => void listing.refetch()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <View style={styles.fileList}>
          {listing.data?.folders.map((folder) => (
            <View key={folder.id} style={styles.fileRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFolderStack((stack) => [...stack, { id: folder.id, name: folder.name }])}
                style={styles.fileOpen}
              >
                <View style={[styles.fileType, styles.folderTone]}><Text style={styles.fileTypeText}>FOLDER</Text></View>
                <View style={styles.fileCopy}>
                  <Text numberOfLines={1} style={styles.fileName}>{folder.name}</Text>
                  <Text style={styles.fileMeta}>{folder.isFavorite ? "Favourite folder" : "Folder"}</Text>
                </View>
                <Text style={styles.openMark}>›</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`More actions for ${folder.name}`} onPress={() => setSelectedFolder(folder)} style={({ pressed }) => [styles.rowAction, pressed ? styles.rowActionPressed : null]}>
                <Text style={styles.rowActionText}>More</Text>
              </Pressable>
            </View>
          ))}
          {listing.data?.files.map((file) => (
            <View key={file.id} style={styles.fileRow}>
              <View style={[styles.fileType, styles.fileTone]}>
                <Text style={styles.fileTypeText}>{file.mimeType.split("/").at(-1)?.slice(0, 5).toUpperCase() ?? "FILE"}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void openDownloadedFile(file, true)} style={styles.fileCopy}>
                <Text numberOfLines={1} style={styles.fileName}>{file.name}</Text>
                <Text style={styles.fileMeta}>{formatBytes(Number(file.sizeBytes))} · {formatDate(file.createdAt)}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`More actions for ${file.name}`} onPress={() => setSelectedFile(file)} style={({ pressed }) => [styles.rowAction, pressed ? styles.rowActionPressed : null]}>
                <Text style={styles.rowActionText}>More</Text>
              </Pressable>
            </View>
          ))}
          {!listing.data?.folders.length && !listing.data?.files.length ? (
            <View style={styles.state}>
              <Text style={styles.stateTitle}>This folder is empty</Text>
              <Text style={styles.stateText}>Upload a file or create a folder to get started.</Text>
            </View>
          ) : null}
        </View>
      )}
      {downloadingFile ? (
        <Text accessibilityRole="status" style={styles.downloadStatus}>
          Downloading {listing.data?.files.find((file) => file.id === downloadingFile)?.name ?? "file"}
          {downloadProgress?.total && downloadProgress.total > 0
            ? ` · ${Math.min(100, Math.round(downloadProgress.written / downloadProgress.total * 100))}%`
            : "…"}
        </Text>
      ) : null}
      <Modal animationType="slide" onRequestClose={() => setSelectedFile(null)} transparent visible={Boolean(selectedFile)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.actionSheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetKicker}>FILE DETAILS</Text>
            <Text numberOfLines={2} style={styles.sheetTitle}>{selectedFile?.name}</Text>
            {selectedFile ? (
              <>
                <Text style={styles.sheetMeta}>{selectedFile.mimeType} · {formatBytes(Number(selectedFile.sizeBytes))}</Text>
                <Text style={styles.sheetMeta}>Added {formatDate(selectedFile.createdAt)}</Text>
              </>
            ) : null}
            <ScrollView
              contentContainerStyle={styles.sheetActions}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={styles.sheetActionScroll}
            >
              <SheetAction label={downloadingFile === selectedFile?.id ? "Preparing preview…" : "Preview"} disabled={Boolean(downloadingFile)} onPress={() => {
                if (selectedFile) void openDownloadedFile(selectedFile, true);
                setSelectedFile(null);
              }} />
              <SheetAction label="Download / share file" disabled={Boolean(downloadingFile)} onPress={() => {
                if (selectedFile) void openDownloadedFile(selectedFile, false);
                setSelectedFile(null);
              }} />
              <SheetAction label="Create public share link" onPress={() => {
                setSharingFile(selectedFile);
                setSelectedFile(null);
              }} />
              <SheetAction label={selectedFile?.isFavorite ? "Remove from favourites" : "Add to favourites"} onPress={() => {
                if (selectedFile) toggleFavorite.mutate({ id: selectedFile.id, value: !selectedFile.isFavorite });
                setSelectedFile(null);
              }} />
              <SheetAction danger label="Move to Recycle Bin" onPress={() => {
                if (selectedFile) confirmTrash(selectedFile.id, selectedFile.name);
                setSelectedFile(null);
              }} />
            </ScrollView>
            <Pressable onPress={() => setSelectedFile(null)} style={styles.sheetClose}><Text style={styles.sheetCloseText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
      {sharingFile ? <FileShareSheet file={sharingFile} onClose={() => setSharingFile(null)} /> : null}
      {selectedFolder ? <FolderActionSheet folder={selectedFolder} onClose={() => setSelectedFolder(null)} onChanged={refreshFiles} /> : null}
      <View style={styles.footerLink}>
        <Link href="/(app)" asChild>
          <Pressable style={styles.backButton}>
            <Text style={styles.backText}>Back to overview</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "Size unavailable";
  if (bytes < 1024) return `${bytes} bytes`;
  const units = ["KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)) - 1, units.length - 1);
  const amount = bytes / 1024 ** (index + 1);
  return `${amount >= 10 ? Math.round(amount) : amount.toFixed(1)} ${units[index]}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function SheetAction({ label, onPress, disabled = false, danger = false }: { label: string; onPress?: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.sheetAction, disabled ? styles.sheetActionDisabled : null, pressed && !disabled ? styles.sheetActionPressed : null]}>
      <Text style={[styles.sheetActionText, danger ? styles.sheetDanger : null, disabled ? styles.sheetActionTextDisabled : null]}>{label}</Text>
      {!disabled ? <Text style={[styles.sheetChevron, danger ? styles.sheetDanger : null]}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 64,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: {
    color: colors.greenDark,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  primaryActionText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  secondaryAction: {
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryActionText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  collectionLinks: { flexDirection: "row", gap: 10 },
  collectionLink: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  collectionLinkText: { color: colors.greenDark, fontSize: 13, fontWeight: "700" },
  createFolder: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.ink,
    fontSize: 14,
  },
  createButton: { backgroundColor: colors.greenWash, borderRadius: 12, justifyContent: "center", paddingHorizontal: 13 },
  createButtonText: { color: colors.greenDark, fontWeight: "700", fontSize: 12 },
  backFolder: { alignSelf: "flex-start", paddingVertical: 4 },
  backFolderText: { color: colors.greenDark, fontSize: 14, fontWeight: "700" },
  error: { color: colors.red, fontSize: 13, lineHeight: 19 },
  state: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 16, gap: 8 },
  stateTitle: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  stateText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  retry: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.greenWash, borderRadius: 10 },
  retryText: { color: colors.greenDark, fontWeight: "700", fontSize: 13 },
  footerLink: { marginTop: 4 },
  openMark: { color: colors.muted, fontSize: 25, marginLeft: 4 },
  rowAction: {
    minWidth: 54,
    minHeight: 44,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.greenWash,
    paddingHorizontal: 10,
  },
  rowActionPressed: { backgroundColor: colors.green, borderColor: colors.green },
  rowActionText: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  downloadStatus: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12, 31, 24, 0.42)" },
  actionSheet: { width: "100%", maxHeight: "90%", backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24, gap: 9 },
  grabber: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: "center", marginBottom: 3 },
  sheetKicker: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  sheetTitle: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "700" },
  sheetMeta: { color: colors.muted, fontSize: 12 },
  sheetActionScroll: { flexShrink: 1 },
  sheetActions: { gap: 8, paddingTop: 6, paddingBottom: 4 },
  sheetAction: { width: "100%", minHeight: 48, borderRadius: 13, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetActionPressed: { backgroundColor: colors.greenWash, borderColor: colors.green },
  sheetActionDisabled: { backgroundColor: colors.background },
  sheetActionText: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 13, fontWeight: "700" },
  sheetActionTextDisabled: { color: colors.muted },
  sheetDanger: { color: colors.red },
  sheetChevron: { flexShrink: 0, color: colors.muted, fontSize: 20 },
  sheetClose: { alignItems: "center", paddingVertical: 9 },
  sheetCloseText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  fileList: {
    gap: 12,
  },
  fileOpen: { flex: 1, minWidth: 0, flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  fileRow: {
    width: "100%",
    minWidth: 0,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fileType: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileTone: {
    backgroundColor: colors.greenWash,
  },
  folderTone: {
    backgroundColor: colors.sand,
  },
  fileTypeText: {
    color: colors.greenDark,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  fileCopy: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    gap: 4,
  },
  fileName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  fileMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  fileSize: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  backButton: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  backText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
  },
});
