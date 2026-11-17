import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const approvals = [
  { title: "Finance budget", status: "Pending", owner: "Daniel Kim" },
  { title: "Marketing launch deck", status: "Needs review", owner: "Nia Brooks" },
  { title: "Legal contract", status: "Approved", owner: "Aisha Okafor" },
];

export default function WorkspaceApprovalsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>APPROVALS</Text>
        <Text style={styles.title}>Sign-off queue</Text>
      </View>

      <View style={styles.card}>
        {approvals.map((item) => (
          <View key={item.title} style={styles.itemRow}>
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemOwner}>{item.owner}</Text>
            </View>
            <Text style={[styles.status, item.status === "Approved" ? styles.approved : item.status === "Pending" ? styles.pending : styles.reviewing]}>{item.status}</Text>
          </View>
        ))}
      </View>

      <Link href="/(app)/workspace" asChild>
        <Text style={styles.link}>Back to workspace</Text>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  itemOwner: {
    color: colors.muted,
    fontSize: 12,
  },
  status: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  pending: {
    backgroundColor: colors.sand,
    color: colors.ink,
  },
  reviewing: {
    backgroundColor: colors.greenWash,
    color: colors.greenDark,
  },
  approved: {
    backgroundColor: colors.greenWash,
    color: colors.greenDark,
  },
  link: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
