import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const filters = ["All", "Shared", "Private", "Approvals", "Folders"];
const items = [
  { name: "Board Pack", type: "PDF", owner: "Finance", meta: "Updated today" },
  { name: "Client Assets", type: "FOLDER", owner: "Marketing", meta: "12 files" },
  { name: "Operations Brief", type: "DOC", owner: "Operations", meta: "Shared with everyone" },
  { name: "Procurement", type: "FOLDER", owner: "Legal", meta: "Inherited access" },
  { name: "Launch Notes", type: "PDF", owner: "Team", meta: "Requires sign-off" },
];

export default function WorkspaceFilesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>WORKSPACE FILES</Text>
          <Text style={styles.title}>Shared & private</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((filter) => (
          <Pressable key={filter} style={[styles.filterPill, filter === "All" ? styles.filterActive : null]}>
            <Text style={[styles.filterText, filter === "All" ? styles.filterTextActive : null]}>{filter}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.name} style={styles.itemRow}>
            <View style={[styles.typeBadge, item.type === "FOLDER" ? styles.folderBadge : styles.fileBadge]}>
              <Text style={styles.typeText}>{item.type}</Text>
            </View>
            <View style={styles.itemBody}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.owner} · {item.meta}</Text>
            </View>
          </View>
        ))}
      </View>

      <Link href="/(app)/workspace" asChild>
        <Pressable style={styles.backButton}>
          <Text style={styles.backText}>Back to workspace</Text>
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
    gap: 8,
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
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterPill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterActive: {
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
  list: {
    gap: 12,
  },
  itemRow: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fileBadge: {
    backgroundColor: colors.greenWash,
  },
  folderBadge: {
    backgroundColor: colors.sand,
  },
  typeText: {
    color: colors.greenDark,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 12,
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
