import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandMark } from "@/ui/components";
import { colors } from "@/ui/theme";
import {
  getPersonalFileCollection,
  getPersonalFolderFavorites,
  permanentlyDeletePersonalFile,
  restorePersonalFile,
  setPersonalFileFavorite,
  setPersonalFolderFavorite,
  type PersonalFolder,
  type PersonalFile,
} from "@/files/api";

type Props = { collection: "favorites" | "trash" };

export function FileCollectionScreen({ collection }: Props) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");
  const isTrash = collection === "trash";
  const title = isTrash ? "Recycle Bin" : "Favourites";
  const listing = useQuery({
    queryKey: ["personal-file-collections", collection],
    queryFn: () => getPersonalFileCollection(collection),
  });
  const folderFavorites = useQuery({
    queryKey: ["personal-folder-favorites"],
    queryFn: getPersonalFolderFavorites,
    enabled: !isTrash,
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["personal-file-collections"] });
    await queryClient.invalidateQueries({ queryKey: ["personal-files"] });
    await queryClient.invalidateQueries({ queryKey: ["personal-file-search"] });
    await queryClient.invalidateQueries({ queryKey: ["personal-folder-favorites"] });
  };
  const restore = useMutation({
    mutationFn: restorePersonalFile,
    onSuccess: refresh,
    onError: (error) => setActionError(error instanceof Error ? error.message : "The file could not be restored."),
  });
  const removeFavorite = useMutation({
    mutationFn: (id: string) => setPersonalFileFavorite(id, false),
    onSuccess: refresh,
    onError: (error) => setActionError(error instanceof Error ? error.message : "The favourite could not be removed."),
  });
  const removeFolderFavorite = useMutation({
    mutationFn: (id: string) => setPersonalFolderFavorite(id, false),
    onSuccess: refresh,
    onError: (error) => setActionError(error instanceof Error ? error.message : "The folder favorite could not be removed."),
  });
  const permanentlyDelete = useMutation({
    mutationFn: permanentlyDeletePersonalFile,
    onSuccess: refresh,
    onError: (error) => setActionError(error instanceof Error ? error.message : "The file could not be permanently deleted."),
  });

  function confirmPermanentDelete(file: PersonalFile) {
    Alert.alert("Delete permanently?", `${file.name} cannot be recovered after this action.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete permanently", style: "destructive", onPress: () => permanentlyDelete.mutate(file.id) },
    ]);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.kicker}>{isTrash ? "YOUR LIBRARY" : "SAVED FILES"}</Text><Text style={styles.title}>{title}</Text></View>
        <BrandMark />
      </View>
      <Text style={styles.subtitle}>
        {isTrash ? "Restore files or permanently delete items in your Recycle Bin." : "Files you have marked as favourites."}
      </Text>
      {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
      {listing.isPending || (!isTrash && folderFavorites.isPending) ? (
        <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.body}>Loading {title.toLowerCase()}…</Text></View>
      ) : listing.isError || (!isTrash && folderFavorites.isError) ? (
        <View style={styles.state}>
          <Text style={styles.rowTitle}>{title} couldn’t load</Text>
          <Text style={styles.body}>
            {listing.error instanceof Error ? listing.error.message : folderFavorites.error instanceof Error ? folderFavorites.error.message : "Please try again."}
          </Text>
          <Pressable onPress={() => { void listing.refetch(); if (!isTrash) void folderFavorites.refetch(); }} style={styles.action}><Text style={styles.actionText}>Try again</Text></Pressable>
        </View>
      ) : (listing.data?.length ?? 0) > 0 || (folderFavorites.data?.length ?? 0) > 0 ? (
        <View style={styles.list}>
          {folderFavorites.data?.map((folder) => (
            <FavoriteFolderRow key={folder.id} folder={folder} onRemove={() => removeFolderFavorite.mutate(folder.id)} />
          ))}
          {listing.data.map((file) => (
            <View key={file.id} style={styles.row}>
              <View style={styles.fileBadge}><Text style={styles.fileBadgeText}>{file.mimeType.split("/").at(-1)?.slice(0, 4).toUpperCase() ?? "FILE"}</Text></View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.rowTitle}>{file.name}</Text>
                <Text style={styles.body}>{isTrash ? "Deleted" : file.folderName ?? "Personal files"} · {formatDate(isTrash ? file.deletedAt : file.createdAt)}</Text>
              </View>
              {isTrash ? (
                <View style={styles.actions}>
                  <Pressable accessibilityLabel={`Restore ${file.name}`} onPress={() => restore.mutate(file.id)} style={styles.action}><Text style={styles.actionText}>Restore</Text></Pressable>
                  <Pressable accessibilityLabel={`Permanently delete ${file.name}`} onPress={() => confirmPermanentDelete(file)} style={styles.deleteAction}><Text style={styles.deleteText}>Delete</Text></Pressable>
                </View>
              ) : (
                <Pressable accessibilityLabel={`Remove ${file.name} from favourites`} onPress={() => removeFavorite.mutate(file.id)} style={styles.action}>
                  <Text style={styles.actionText}>Remove</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.state}><Text style={styles.rowTitle}>{isTrash ? "Nothing in the Recycle Bin" : "No favourites yet"}</Text><Text style={styles.body}>Files and folders you add here will appear in this list.</Text></View>
      )}
      <Link href="/(app)/files" asChild><Pressable style={styles.back}><Text style={styles.backText}>Back to files</Text></Pressable></Link>
    </ScrollView>
  );
}

function FavoriteFolderRow({ folder, onRemove }: { folder: PersonalFolder; onRemove: () => void }) {
  return (
    <View style={styles.row}>
      <View style={[styles.fileBadge, styles.folderBadge]}><Text style={styles.fileBadgeText}>FOLDER</Text></View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.rowTitle}>{folder.name}</Text>
        <Text style={styles.body}>Favourite folder</Text>
      </View>
      <Link href={{ pathname: "/(app)/files", params: { folderId: folder.id, folderName: folder.name } }} asChild>
        <Pressable style={styles.action}><Text style={styles.actionText}>Open</Text></Pressable>
      </Link>
      <Pressable accessibilityLabel={`Remove ${folder.name} from favourites`} onPress={onRemove} style={styles.deleteAction}>
        <Text style={styles.deleteText}>Remove</Text>
      </Pressable>
    </View>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.red, fontSize: 13 },
  list: { gap: 10 },
  row: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  fileBadge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenWash },
  folderBadge: { backgroundColor: colors.sand },
  fileBadgeText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  copy: { flex: 1, gap: 4 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  actions: { gap: 6 },
  action: { backgroundColor: colors.greenWash, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center" },
  actionText: { color: colors.greenDark, fontSize: 11, fontWeight: "700" },
  deleteAction: { paddingHorizontal: 10, paddingVertical: 7, alignItems: "center" },
  deleteText: { color: colors.red, fontSize: 11, fontWeight: "700" },
  state: { alignItems: "center", padding: 24, gap: 10 },
  back: { backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  backText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
});
