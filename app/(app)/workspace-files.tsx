import { File as LocalFile } from "expo-file-system";
import { Link } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as Sharing from "expo-sharing";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getWorkspaces } from "@/communications/api";
import { useAuthStore } from "@/auth/auth-store";
import {
  createWorkspaceFolder,
  deleteWorkspaceFile,
  deleteWorkspaceFolder,
  getWorkspaceFileListing,
  getWorkspaceFolders,
  moveWorkspaceFile,
  renameWorkspaceFile,
  renameWorkspaceFolder,
  uploadWorkspaceFile,
  type WorkspaceFile,
  type WorkspaceFolder,
} from "@/files/api";
import { downloadAuthenticatedFile } from "@/files/download";
import { FileShareSheet } from "@/files/share-sheet";
import { getWorkspaceDetail } from "@/workspaces/api";
import { BrandMark } from "@/ui/components";
import { colors } from "@/ui/theme";

type ActionMode = "actions" | "rename" | "move";

export default function WorkspaceFilesScreen() {
  const queryClient = useQueryClient();
  const registeredWorkspaceId = useAuthStore((state) => state.workspaceId);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(registeredWorkspaceId);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<WorkspaceFolder | null>(null);
  const [sharingFile, setSharingFile] = useState<WorkspaceFile | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>("actions");
  const [draftName, setDraftName] = useState("");
  const [destinationFolderId, setDestinationFolderId] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<{ written: number; total: number } | null>(null);

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  const workspaces = workspacesQuery.data ?? [];
  const workspace = workspaces.find((item) => item.id === selectedWorkspaceId) ?? workspaces[0] ?? null;
  const workspaceId = workspace?.id ?? null;
  const folderId = folderStack.at(-1)?.id ?? null;
  const isAdministrator = workspace?.role === "OWNER" || workspace?.role === "ADMIN";
  const workspaceLifecycle = useQuery({
    queryKey: ["workspace-detail", workspaceId],
    queryFn: () => getWorkspaceDetail(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const lifecycle = workspaceLifecycle.data?.subscription;
  const workspaceRestricted = lifecycle?.restricted === true;
  const requireWorkspaceId = () => {
    if (!workspaceId) throw new Error("Select a business workspace before continuing.");
    return workspaceId;
  };
  const requireSelectedFile = () => {
    if (!selectedFile) throw new Error("Select a workspace file before continuing.");
    return selectedFile;
  };

  useEffect(() => {
    if (workspaces.length && !workspaces.some((item) => item.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(
        workspaces.some((item) => item.id === registeredWorkspaceId)
          ? registeredWorkspaceId
          : workspaces[0]?.id ?? null,
      );
      setFolderStack([]);
    }
  }, [registeredWorkspaceId, selectedWorkspaceId, workspaces]);

  const foldersQuery = useQuery({
    queryKey: ["workspace-folders", workspaceId],
    queryFn: () => getWorkspaceFolders(requireWorkspaceId()),
    enabled: Boolean(workspaceId),
  });
  const listing = useQuery({
    queryKey: ["workspace-storage", workspaceId, folderId],
    queryFn: () => getWorkspaceFileListing(requireWorkspaceId(), folderId),
    enabled: Boolean(workspaceId),
  });
  const currentFolder = foldersQuery.data?.find((folder) => folder.id === folderId);
  const currentPermissions = new Set(currentFolder?.permissions ?? []);
  const canCreateFolder = isAdministrator || currentPermissions.has("createSubfolders");
  const canUpload = isAdministrator || currentPermissions.has("uploadFiles");
  const canDownload = isAdministrator || currentPermissions.has("downloadFiles");
  const canRenameFiles = isAdministrator || currentPermissions.has("renameFiles");
  const canMoveFiles = isAdministrator || currentPermissions.has("moveFiles");
  const canDeleteFiles = isAdministrator || currentPermissions.has("deleteFiles");
  const canShareFiles = isAdministrator || currentPermissions.has("shareFiles");
  const selectedFolderPermissions = new Set(
    foldersQuery.data?.find((folder) => folder.id === selectedFolder?.id)?.permissions ?? [],
  );
  const canRenameSelectedFolder = isAdministrator || selectedFolderPermissions.has("renameFolders");
  const canDeleteSelectedFolder = isAdministrator || selectedFolderPermissions.has("manageContents");

  async function refreshLibrary() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workspace-storage", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-folders", workspaceId] }),
    ]);
  }

  const createFolder = useMutation({
    mutationFn: () => createWorkspaceFolder(requireWorkspaceId(), newFolderName.trim(), folderId),
    onSuccess: async () => {
      setNewFolderName("");
      setActionError("");
      await refreshLibrary();
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : "The folder could not be created."),
  });
  const uploadFile = useMutation({
    mutationFn: ({ file }: { file: LocalFile }) => uploadWorkspaceFile(requireWorkspaceId(), file, folderId),
    onSuccess: refreshLibrary,
    onError: (error) => setActionError(error instanceof Error ? error.message : "The file could not be uploaded."),
  });
  const renameFile = useMutation({
    mutationFn: () => renameWorkspaceFile(requireWorkspaceId(), requireSelectedFile().id, draftName.trim()),
    onSuccess: async () => { setSelectedFile(null); await refreshLibrary(); },
    onError: (error) => setActionError(error instanceof Error ? error.message : "The file could not be renamed."),
  });
  const moveFile = useMutation({
    mutationFn: () => moveWorkspaceFile(requireWorkspaceId(), requireSelectedFile().id, destinationFolderId),
    onSuccess: async () => { setSelectedFile(null); await refreshLibrary(); },
    onError: (error) => setActionError(error instanceof Error ? error.message : "The file could not be moved."),
  });
  const removeFile = useMutation({
    mutationFn: () => deleteWorkspaceFile(requireWorkspaceId(), requireSelectedFile().id),
    onSuccess: async () => { setSelectedFile(null); await refreshLibrary(); },
    onError: (error) => setActionError(error instanceof Error ? error.message : "The file could not be deleted."),
  });
  const renameFolder = useMutation({
    mutationFn: () => {
      if (!selectedFolder) throw new Error("Select a workspace folder before continuing.");
      return renameWorkspaceFolder(requireWorkspaceId(), selectedFolder.id, draftName.trim());
    },
    onSuccess: async () => { setSelectedFolder(null); await refreshLibrary(); },
    onError: (error) => setActionError(error instanceof Error ? error.message : "The folder could not be renamed."),
  });
  const removeFolder = useMutation({
    mutationFn: () => {
      if (!selectedFolder) throw new Error("Select a workspace folder before continuing.");
      return deleteWorkspaceFolder(requireWorkspaceId(), selectedFolder.id);
    },
    onSuccess: async () => { setSelectedFolder(null); await refreshLibrary(); },
    onError: (error) => setActionError(error instanceof Error ? error.message : "The folder could not be deleted."),
  });

  async function downloadFile(file: WorkspaceFile, preview: boolean) {
    setActionError("");
    if (!workspaceId) {
      setActionError("Select a business workspace before downloading a file.");
      return;
    }
    setDownloadingFileId(file.id);
    setDownloadProgress(null);
    try {
      const localFile = await downloadAuthenticatedFile(
        `/workspaces/${encodeURIComponent(workspaceId)}/files/${encodeURIComponent(file.id)}/download`,
        file,
        (written, total) => setDownloadProgress({ written, total }),
      );
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
      setActionError(error instanceof Error ? error.message : "The file could not be downloaded.");
    } finally {
      setDownloadingFileId("");
      setDownloadProgress(null);
    }
  }

  async function pickAndUploadFile() {
    setActionError("");
    try {
      const selected = await LocalFile.pickFileAsync();
      if (!selected.canceled) uploadFile.mutate({ file: selected.result });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The file picker could not be opened.");
    }
  }

  function confirmDeleteFile() {
    if (!selectedFile) return;
    Alert.alert("Delete workspace file?", `${selectedFile.name} will be permanently deleted.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete file", style: "destructive", onPress: () => removeFile.mutate() },
    ]);
  }

  function confirmDeleteFolder() {
    if (!selectedFolder) return;
    Alert.alert("Delete workspace folder?", `${selectedFolder.name} must be empty before it can be deleted.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete folder", style: "destructive", onPress: () => removeFolder.mutate() },
    ]);
  }

  const moveDestinations = (foldersQuery.data ?? []).filter((folder) =>
    isAdministrator || folder.permissions?.includes("uploadFiles"),
  );
  const files = listing.data?.files ?? [];
  const folders = listing.data?.folders ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.kicker}>BUSINESS WORKSPACE</Text><Text style={styles.title}>{currentFolder?.name ?? "Shared files"}</Text></View>
        <BrandMark />
      </View>
      {workspacesQuery.isPending ? (
        <State title="Loading workspace…" />
      ) : workspacesQuery.isError ? (
        <State title="Workspaces couldn’t load" detail={message(workspacesQuery.error)} retry={() => void workspacesQuery.refetch()} />
      ) : !workspaces.length ? (
        <State title="No business workspace yet" detail="A workspace you own or have been invited to will appear here." />
      ) : (
        <>
          {workspaces.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workspaceChoices}>
              {workspaces.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: workspace?.id === item.id }}
                  key={item.id}
                  onPress={() => {
                    setSelectedWorkspaceId(item.id);
                    setFolderStack([]);
                    setActionError("");
                  }}
                  style={[styles.workspaceChip, workspace?.id === item.id ? styles.workspaceChipActive : null]}
                >
                  <Text style={[styles.workspaceChipText, workspace?.id === item.id ? styles.workspaceChipTextActive : null]}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : workspace ? <Text style={styles.workspaceLabel}>{workspace.name} · {workspace.role.toLowerCase()}</Text> : null}
          <Text style={styles.subtitle}>
            {isAdministrator ? "Shared business documents, protected by workspace access rules." : "Only folders assigned to you appear here. Server permissions govern every action."}
          </Text>
          {lifecycle && lifecycle.state !== "ACTIVE" && lifecycle.state !== "FREE" ? (
            <View style={workspaceRestricted ? [styles.subscriptionBanner, styles.subscriptionRestricted] : styles.subscriptionBanner}>
              <Text style={styles.subscriptionTitle}>{workspaceRestricted ? "Workspace temporarily restricted" : "Subscription expires soon"}</Text>
              <Text style={styles.subscriptionText}>{workspaceRestricted
                ? "Existing files remain viewable and downloadable. Workspace editing and collaboration are temporarily unavailable."
                : `The subscription expired; ${lifecycle.graceDaysRemaining} grace-period day${lifecycle.graceDaysRemaining === 1 ? "" : "s"} remain.`}</Text>
              {isAdministrator ? <Text style={styles.subscriptionRenew}>Renew from the billing and subscription screen.</Text> : null}
            </View>
          ) : null}
          {!workspaceRestricted && (canCreateFolder || canUpload) ? (
            <View style={styles.createRow}>
              {canCreateFolder ? (
                <>
                  <TextInput
                    accessibilityLabel="New workspace folder name"
                    onChangeText={setNewFolderName}
                    placeholder="New folder name"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={newFolderName}
                  />
                  <Pressable disabled={!newFolderName.trim() || createFolder.isPending} onPress={() => createFolder.mutate()} style={styles.createButton}>
                    <Text style={styles.createButtonText}>{createFolder.isPending ? "Creating…" : "Create"}</Text>
                  </Pressable>
                </>
              ) : null}
              {canUpload ? (
                <Pressable disabled={uploadFile.isPending} onPress={pickAndUploadFile} style={styles.createButton}>
                  <Text style={styles.createButtonText}>{uploadFile.isPending ? "Uploading…" : "Upload file"}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {folderStack.length ? (
            <Pressable onPress={() => setFolderStack((stack) => stack.slice(0, -1))} style={styles.backFolder}>
              <Text style={styles.backFolderText}>‹  Back to {folderStack.length > 1 ? folderStack.at(-2)?.name : "Assigned folders"}</Text>
            </Pressable>
          ) : null}
          {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
          {downloadingFileId ? <Text accessibilityRole="status" style={styles.downloadStatus}>
            Downloading {files.find((file) => file.id === downloadingFileId)?.name ?? "file"}
            {downloadProgress?.total && downloadProgress.total > 0 ? ` · ${Math.min(100, Math.round(downloadProgress.written / downloadProgress.total * 100))}%` : "…"}
          </Text> : null}
          {foldersQuery.isPending || listing.isPending ? (
            <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.body}>Loading authorized folders…</Text></View>
          ) : foldersQuery.isError || listing.isError ? (
            <View style={styles.state}>
              <Text style={styles.stateTitle}>These files couldn’t load</Text>
              <Text style={styles.body}>{message(foldersQuery.error ?? listing.error)}</Text>
              <Pressable onPress={() => { void foldersQuery.refetch(); void listing.refetch(); }} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {folders.map((folder) => {
                const folderPermissions = new Set(foldersQuery.data?.find((item) => item.id === folder.id)?.permissions ?? []);
                const canManageFolder = isAdministrator || folderPermissions.has("renameFolders") || folderPermissions.has("manageContents");
                return (
                  <View key={folder.id} style={styles.row}>
                    <Pressable onPress={() => setFolderStack((stack) => [...stack, { id: folder.id, name: folder.name }])} style={styles.openRow}>
                      <View style={[styles.badge, styles.folderBadge]}><Text style={styles.badgeText}>FOLDER</Text></View>
                      <View style={styles.copy}><Text numberOfLines={1} style={styles.rowTitle}>{folder.name}</Text><Text style={styles.body}>Shared folder</Text></View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                    {canManageFolder ? <Pressable accessibilityLabel={`Manage ${folder.name}`} onPress={() => { setSelectedFolder(folder); setDraftName(folder.name); }} style={styles.more}><Text style={styles.moreText}>•••</Text></Pressable> : null}
                  </View>
                );
              })}
              {files.map((file) => (
                <View key={file.id} style={styles.row}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{file.mimeType.split("/").at(-1)?.slice(0, 4).toUpperCase() ?? "FILE"}</Text></View>
                  <Pressable disabled={!canDownload} onPress={() => void downloadFile(file, true)} style={styles.copy}>
                    <Text numberOfLines={1} style={styles.rowTitle}>{file.name}</Text>
                    <Text style={styles.body}>{formatBytes(Number(file.sizeBytes))} · {formatDate(file.createdAt)}</Text>
                  </Pressable>
                  {canDownload ? <Pressable accessibilityLabel={`Preview ${file.name}`} onPress={() => void downloadFile(file, true)} style={styles.quickAction}><Text style={styles.quickActionText}>Open</Text></Pressable> : null}
                  {(canRenameFiles || canMoveFiles || canDeleteFiles || canShareFiles) ? (
                    <Pressable accessibilityLabel={`More actions for ${file.name}`} onPress={() => { setSelectedFile(file); setActionMode("actions"); setDraftName(file.name); }} style={styles.more}>
                      <Text style={styles.moreText}>•••</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {!folders.length && !files.length ? (
                <View style={styles.state}><Text style={styles.stateTitle}>No shared files here</Text><Text style={styles.body}>Files and folders assigned to your role appear in this space.</Text></View>
              ) : null}
            </View>
          )}
        </>
      )}
      <Link href="/(app)/workspace" asChild><Pressable style={styles.backButton}><Text style={styles.backText}>Back to workspace</Text></Pressable></Link>
      <Modal animationType="slide" onRequestClose={() => setSelectedFile(null)} transparent visible={Boolean(selectedFile)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.eyebrow}>WORKSPACE FILE</Text>
            <Text numberOfLines={2} style={styles.sheetTitle}>{selectedFile?.name}</Text>
            <Text style={styles.sheetMeta}>{selectedFile?.mimeType} · {formatBytes(Number(selectedFile?.sizeBytes))}</Text>
            {actionMode === "actions" ? (
              <View style={styles.sheetActions}>
                {canDownload ? <SheetAction label={downloadingFileId === selectedFile?.id ? "Opening…" : "Preview file"} onPress={() => selectedFile && void downloadFile(selectedFile, true)} disabled={Boolean(downloadingFileId)} /> : null}
                {canDownload ? <SheetAction label="Download / share file" onPress={() => selectedFile && void downloadFile(selectedFile, false)} disabled={Boolean(downloadingFileId)} /> : null}
                {canShareFiles ? <SheetAction label="Manage public share links" onPress={() => { setSharingFile(selectedFile); setSelectedFile(null); }} /> : null}
                {!workspaceRestricted && canRenameFiles ? <SheetAction label="Rename file" onPress={() => { setActionMode("rename"); setActionError(""); }} /> : null}
                {!workspaceRestricted && canMoveFiles ? <SheetAction label="Move file" onPress={() => { setDestinationFolderId(selectedFile?.folderId ?? null); setActionMode("move"); setActionError(""); }} /> : null}
                {!workspaceRestricted && canDeleteFiles ? <SheetAction danger label="Delete file permanently" onPress={confirmDeleteFile} /> : null}
              </View>
            ) : actionMode === "rename" ? (
              <View style={styles.editor}>
                <Text style={styles.label}>New file name</Text>
                <TextInput autoFocus onChangeText={setDraftName} selectTextOnFocus style={styles.input} value={draftName} />
                <View style={styles.footer}>
                  <Pressable onPress={() => setActionMode("actions")} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                  <Pressable disabled={!draftName.trim() || draftName.trim() === selectedFile?.name || renameFile.isPending} onPress={() => renameFile.mutate()} style={styles.primary}>
                    <Text style={styles.primaryText}>{renameFile.isPending ? "Saving…" : "Save name"}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.editor}>
                <Text style={styles.label}>Choose an authorized destination</Text>
                <ScrollView style={styles.destinations}>
                  {isAdministrator ? <Destination label="Workspace root" selected={destinationFolderId === null} onPress={() => setDestinationFolderId(null)} /> : null}
                  {moveDestinations.map((folder) => (
                    <Destination
                      key={folder.id}
                      label={`${"  ".repeat(folderDepth(folder, foldersQuery.data ?? []))}${folder.name}`}
                      selected={destinationFolderId === folder.id}
                      onPress={() => setDestinationFolderId(folder.id)}
                    />
                  ))}
                </ScrollView>
                <View style={styles.footer}>
                  <Pressable onPress={() => setActionMode("actions")} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                  <Pressable disabled={destinationFolderId === selectedFile?.folderId || moveFile.isPending} onPress={() => moveFile.mutate()} style={styles.primary}>
                    <Text style={styles.primaryText}>{moveFile.isPending ? "Moving…" : "Move file"}</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
            <Pressable onPress={() => setSelectedFile(null)} style={styles.close}><Text style={styles.cancelText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
      <Modal animationType="slide" onRequestClose={() => setSelectedFolder(null)} transparent visible={Boolean(selectedFolder)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.eyebrow}>FOLDER CONTROLS</Text>
            <Text numberOfLines={1} style={styles.sheetTitle}>{selectedFolder?.name}</Text>
            <View style={styles.editor}>
              {!workspaceRestricted && canRenameSelectedFolder ? (
                <>
                  <Text style={styles.label}>Rename folder</Text>
                  <TextInput onChangeText={setDraftName} style={styles.input} value={draftName} />
                  <Pressable disabled={!draftName.trim() || draftName.trim() === selectedFolder?.name || renameFolder.isPending} onPress={() => renameFolder.mutate()} style={styles.primary}>
                    <Text style={styles.primaryText}>{renameFolder.isPending ? "Saving…" : "Save name"}</Text>
                  </Pressable>
                </>
              ) : null}
              {!workspaceRestricted && canDeleteSelectedFolder ? <SheetAction danger label="Delete empty folder" onPress={confirmDeleteFolder} /> : null}
              {isAdministrator && !workspaceRestricted && selectedFolder ? <Link href={`/(app)/workspace-team` as any} asChild><Pressable style={styles.sheetAction}><Text style={styles.sheetActionText}>Manage folder sharing</Text><Text style={styles.chevron}>›</Text></Pressable></Link> : null}
            </View>
            {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
            <Pressable onPress={() => setSelectedFolder(null)} style={styles.close}><Text style={styles.cancelText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
      {sharingFile && workspaceId ? <FileShareSheet file={sharingFile} workspaceId={workspaceId} onClose={() => setSharingFile(null)} /> : null}
    </ScrollView>
  );
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      {detail ? <Text style={styles.body}>{detail}</Text> : <ActivityIndicator color={colors.green} />}
      {retry ? <Pressable onPress={retry} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable> : null}
    </View>
  );
}

function SheetAction({ label, onPress, disabled = false, danger = false }: { label: string; onPress?: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.sheetAction}>
      <Text style={[styles.sheetActionText, danger ? styles.danger : null]}>{label}</Text><Text style={[styles.chevron, danger ? styles.danger : null]}>›</Text>
    </Pressable>
  );
}

function Destination({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.destination, selected ? styles.destinationSelected : null]}>
      <Text numberOfLines={1} style={[styles.destinationText, selected ? styles.selectedText : null]}>{label}</Text><Text style={styles.destinationRadio}>{selected ? "●" : "○"}</Text>
    </Pressable>
  );
}

function folderDepth(folder: WorkspaceFolder, folders: WorkspaceFolder[]): number {
  const byId = new Map(folders.map((item) => [item.id, item]));
  let depth = 0;
  let parentId = folder.parentFolderId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    depth += 1;
    parentId = parent.parentFolderId;
  }
  return depth;
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

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 22, paddingTop: 20, paddingBottom: 36, gap: 15 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  workspaceLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  subscriptionBanner: { gap: 5, backgroundColor: colors.greenWash, borderColor: colors.green, borderWidth: 1, borderRadius: 14, padding: 12 },
  subscriptionRestricted: { backgroundColor: colors.sand, borderColor: colors.line },
  subscriptionTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  subscriptionText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  subscriptionRenew: { color: colors.greenDark, fontSize: 11, fontWeight: "800" },
  workspaceChoices: { gap: 8 },
  workspaceChip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  workspaceChipActive: { backgroundColor: colors.greenWash, borderColor: colors.green },
  workspaceChipText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  workspaceChipTextActive: { color: colors.greenDark },
  createRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: colors.ink, fontSize: 14 },
  createButton: { backgroundColor: colors.greenWash, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  createButtonText: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  backFolder: { alignSelf: "flex-start", paddingVertical: 3 },
  backFolderText: { color: colors.greenDark, fontSize: 13, fontWeight: "700" },
  error: { color: colors.red, fontSize: 13, lineHeight: 19 },
  downloadStatus: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  list: { gap: 10 },
  row: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: "row", alignItems: "center", gap: 9 },
  openRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.greenWash, alignItems: "center", justifyContent: "center" },
  folderBadge: { backgroundColor: colors.sand },
  badgeText: { color: colors.greenDark, fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  copy: { flex: 1, gap: 4 },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  body: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  chevron: { color: colors.muted, fontSize: 20 },
  more: { minWidth: 32, alignItems: "center", paddingVertical: 6 },
  moreText: { color: colors.muted, fontSize: 15 },
  quickAction: { paddingHorizontal: 9, paddingVertical: 7, backgroundColor: colors.greenWash, borderRadius: 9 },
  quickActionText: { color: colors.greenDark, fontSize: 10, fontWeight: "700" },
  state: { alignItems: "center", padding: 24, gap: 9 },
  stateTitle: { color: colors.ink, fontSize: 15, fontWeight: "700", textAlign: "center" },
  retry: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8 },
  retryText: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  backButton: { backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  backText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12, 31, 24, 0.42)" },
  sheet: { maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24, gap: 10 },
  grabber: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: "center", marginBottom: 3 },
  eyebrow: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  sheetTitle: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "700" },
  sheetMeta: { color: colors.muted, fontSize: 12 },
  sheetActions: { gap: 7, marginTop: 6 },
  sheetAction: { minHeight: 44, borderRadius: 12, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetActionText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  danger: { color: colors.red },
  editor: { gap: 11, marginTop: 4 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  footer: { flexDirection: "row", gap: 9 },
  cancel: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  cancelText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  primary: { flex: 1.4, backgroundColor: colors.green, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primaryText: { color: colors.surface, fontSize: 12, fontWeight: "700" },
  destinations: { maxHeight: 250, borderRadius: 12 },
  destination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 11, paddingVertical: 12 },
  destinationSelected: { backgroundColor: colors.greenWash },
  destinationText: { flex: 1, color: colors.text, fontSize: 12 },
  selectedText: { color: colors.greenDark, fontWeight: "700" },
  destinationRadio: { color: colors.greenDark, fontSize: 14 },
  close: { alignItems: "center", paddingVertical: 7 },
});
