import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandMark } from "@/ui/components";
import { colors } from "@/ui/theme";

const filterOptions = ["All", "Recent", "Shared", "Docs", "Folders"];

const files = [
  { name: "Q3 Strategy Deck", type: "PDF", size: "3.4 MB", updated: "Updated 2h ago" },
  { name: "Board Minutes", type: "DOC", size: "540 KB", updated: "Updated today" },
  { name: "Client Onboarding", type: "FOLDER", size: "14 items", updated: "Shared with team" },
  { name: "Campaign Assets", type: "ZIP", size: "12.8 MB", updated: "Updated yesterday" },
  { name: "Vendor Contracts", type: "PDF", size: "1.2 MB", updated: "Needs review" },
  { name: "Quarterly Budget", type: "XLS", size: "924 KB", updated: "Last edited 3 days ago" },
];

export default function FilesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>PERSONAL FILES</Text>
          <Text style={styles.title}>Your files</Text>
        </View>
        <BrandMark />
      </View>

      <View style={styles.filterRow}>
        {filterOptions.map((option) => (
          <Pressable key={option} style={[styles.filterPill, option === "All" ? styles.filterPillActive : null]}>
            <Text style={[styles.filterText, option === "All" ? styles.filterTextActive : null]}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.fileList}>
        {files.map((file) => (
          <View key={file.name} style={styles.fileRow}>
            <View style={[styles.fileType, file.type === "FOLDER" ? styles.folderTone : styles.fileTone]}>
              <Text style={styles.fileTypeText}>{file.type}</Text>
            </View>
            <View style={styles.fileCopy}>
              <Text style={styles.fileName}>{file.name}</Text>
              <Text style={styles.fileMeta}>{file.updated}</Text>
            </View>
            <Text style={styles.fileSize}>{file.size}</Text>
          </View>
        ))}
      </View>

      <Link href="/(app)" asChild>
        <Pressable style={styles.backButton}>
          <Text style={styles.backText}>Back to overview</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterPill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: colors.greenWash,
    borderColor: colors.green,
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  filterTextActive: {
    color: colors.greenDark,
  },
  fileList: {
    gap: 12,
  },
  fileRow: {
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
