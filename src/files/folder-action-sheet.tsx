import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  deletePersonalFolder,
  getPersonalFolderTree,
  movePersonalFolder,
  renamePersonalFolder,
  setPersonalFolderFavorite,
  type PersonalFolder,
} from "@/files/api";
import { colors } from "@/ui/theme";

type Props = {
  folder: PersonalFolder;
  onClose: () => void;
  onChanged: () => Promise<void>;
};

type Mode = "actions" | "rename" | "move";

export function FolderActionSheet({ folder, onClose, onChanged }: Props) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("actions");
  const [name, setName] = useState(folder.name);
  const [destinationId, setDestinationId] = useState<string | null>(folder.parentFolderId);
  const [error, setError] = useState("");
  const folderTree = useQuery({
    queryKey: ["personal-folder-tree"],
    queryFn: getPersonalFolderTree,
    enabled: mode === "move",
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["personal-folder-tree"] });
    await onChanged();
  };
  const rename = useMutation({
    mutationFn: () => renamePersonalFolder(folder.id, name.trim()),
    onSuccess: async () => { await refresh(); onClose(); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "The folder could not be renamed."),
  });
  const move = useMutation({
    mutationFn: () => movePersonalFolder(folder.id, destinationId),
    onSuccess: async () => { await refresh(); onClose(); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "The folder could not be moved."),
  });
  const favorite = useMutation({
    mutationFn: () => setPersonalFolderFavorite(folder.id, !folder.isFavorite),
    onSuccess: async () => { await refresh(); onClose(); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "The favorite status could not be changed."),
  });
  const remove = useMutation({
    mutationFn: () => deletePersonalFolder(folder.id),
    onSuccess: async () => { await refresh(); onClose(); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "The folder could not be deleted."),
  });
  const excludedIds = useMemo(() => {
    const children = new Map<string | null, string[]>();
    for (const item of folderTree.data ?? []) {
      const siblings = children.get(item.parentFolderId) ?? [];
      siblings.push(item.id);
      children.set(item.parentFolderId, siblings);
    }
    const excluded = new Set<string>([folder.id]);
    const pending = [folder.id];
    while (pending.length) {
      const parentId = pending.pop();
      if (!parentId) continue;
      for (const childId of children.get(parentId) ?? []) {
        if (!excluded.has(childId)) {
          excluded.add(childId);
          pending.push(childId);
        }
      }
    }
    return excluded;
  }, [folder.id, folderTree.data]);

  function confirmDelete() {
    Alert.alert("Delete folder?", `${folder.name} can only be deleted if it is empty.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete folder", style: "destructive", onPress: () => remove.mutate() },
    ]);
  }

  const busy = rename.isPending || move.isPending || favorite.isPending || remove.isPending;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>FOLDER CONTROLS</Text>
              <Text numberOfLines={1} style={styles.title}>{folder.name}</Text>
            </View>
            <Pressable accessibilityLabel="Close folder controls" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {mode === "actions" ? (
            <ScrollView
              contentContainerStyle={styles.actions}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={styles.actionList}
            >
              <ActionButton label={folder.isFavorite ? "Remove from favourites" : "Add to favourites"} onPress={() => favorite.mutate()} disabled={busy} />
              <ActionButton label="Move folder" onPress={() => { setError(""); setMode("move"); }} disabled={busy} />
              <ActionButton label="Rename folder" onPress={() => { setError(""); setMode("rename"); }} disabled={busy} />
              <ActionButton danger label="Delete folder" onPress={confirmDelete} disabled={busy} />
            </ScrollView>
          ) : mode === "rename" ? (
            <View style={styles.form}>
              <Text style={styles.label}>New folder name</Text>
              <TextInput autoFocus onChangeText={setName} selectTextOnFocus style={styles.input} value={name} />
              <View style={styles.footer}>
                <Pressable onPress={() => setMode("actions")} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
                <Pressable disabled={!name.trim() || name.trim() === folder.name || busy} onPress={() => rename.mutate()} style={styles.primary}>
                  <Text style={styles.primaryText}>{rename.isPending ? "Saving…" : "Save name"}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Choose a destination</Text>
              {folderTree.isPending ? (
                <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.body}>Loading folders…</Text></View>
              ) : folderTree.isError ? (
                <View style={styles.state}><Text style={styles.error}>{folderTree.error instanceof Error ? folderTree.error.message : "Folders could not be loaded."}</Text><Pressable onPress={() => void folderTree.refetch()}><Text style={styles.retry}>Try again</Text></Pressable></View>
              ) : (
                <ScrollView style={styles.destinations}>
                  <Destination label="Your files (root)" selected={destinationId === null} onPress={() => setDestinationId(null)} />
                  {folderTree.data?.filter((item) => !excludedIds.has(item.id)).map((item) => (
                    <Destination
                      key={item.id}
                      label={`${"  ".repeat(folderDepth(item, folderTree.data ?? []))}${item.name}`}
                      selected={destinationId === item.id}
                      onPress={() => setDestinationId(item.id)}
                    />
                  ))}
                </ScrollView>
              )}
              <View style={styles.footer}>
                <Pressable onPress={() => setMode("actions")} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
                <Pressable disabled={destinationId === folder.parentFolderId || folderTree.isPending || folderTree.isError || busy} onPress={() => move.mutate()} style={styles.primary}>
                  <Text style={styles.primaryText}>{move.isPending ? "Moving…" : "Move folder"}</Text>
                </Pressable>
              </View>
            </View>
          )}
          {mode === "actions" ? <Pressable onPress={onClose} style={styles.dismiss}><Text style={styles.secondaryText}>Close</Text></Pressable> : null}
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({ label, onPress, disabled, danger = false }: { label: string; onPress: () => void; disabled: boolean; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.actionButton, pressed && !disabled ? styles.actionButtonPressed : null]}>
      <Text style={[styles.actionText, danger ? styles.deleteText : null]}>{label}</Text>
      <Text style={[styles.chevron, danger ? styles.deleteText : null]}>›</Text>
    </Pressable>
  );
}

function Destination({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.destination, selected ? styles.destinationSelected : null]}>
      <Text numberOfLines={1} style={[styles.destinationText, selected ? styles.selectedText : null]}>{label}</Text>
      <Text style={[styles.radio, selected ? styles.selectedText : null]}>{selected ? "●" : "○"}</Text>
    </Pressable>
  );
}

function folderDepth(folder: PersonalFolder, folders: PersonalFolder[]): number {
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

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12, 31, 24, 0.42)" },
  sheet: { width: "100%", maxHeight: "90%", backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26, gap: 15 },
  grabber: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.line, alignSelf: "center", marginBottom: 3 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headingCopy: { flex: 1, gap: 5, marginRight: 10 },
  eyebrow: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 23, fontWeight: "700" },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.ink, fontSize: 25, lineHeight: 28 },
  error: { color: colors.red, fontSize: 13, lineHeight: 18 },
  actionList: { flexShrink: 1 },
  actions: { gap: 8, paddingVertical: 2 },
  actionButton: { width: "100%", minHeight: 50, borderRadius: 13, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionButtonPressed: { backgroundColor: colors.greenWash, borderColor: colors.green },
  actionText: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 14, fontWeight: "700" },
  chevron: { flexShrink: 0, color: colors.muted, fontSize: 22 },
  deleteText: { color: colors.red },
  form: { gap: 12 },
  label: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 13, paddingVertical: 12, color: colors.ink, fontSize: 15 },
  footer: { flexDirection: "row", gap: 10, paddingTop: 2 },
  secondary: { flex: 1, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingVertical: 13, alignItems: "center" },
  secondaryText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  primary: { flex: 1.5, borderRadius: 13, backgroundColor: colors.green, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: colors.surface, fontWeight: "700", fontSize: 13 },
  destinations: { maxHeight: 280, borderRadius: 12, overflow: "hidden" },
  destination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  destinationSelected: { backgroundColor: colors.greenWash },
  destinationText: { flex: 1, color: colors.text, fontSize: 13 },
  selectedText: { color: colors.greenDark, fontWeight: "700" },
  radio: { color: colors.muted, fontSize: 16 },
  state: { alignItems: "center", padding: 18, gap: 8 },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  retry: { color: colors.greenDark, fontSize: 13, fontWeight: "700" },
  dismiss: { alignItems: "center", paddingVertical: 7 },
});
