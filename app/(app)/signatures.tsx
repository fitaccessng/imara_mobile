import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const signatures = [
  { name: "Board Pack", status: "Awaiting signature", owner: "Aisha" },
  { name: "Employee Contract", status: "Pending review", owner: "HR" },
  { name: "Vendor MOU", status: "Signed", owner: "Legal" },
];

export default function SignaturesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>SIGNATURES</Text>
        <Text style={styles.title}>Document signing</Text>
      </View>

      <View style={styles.card}>
        {signatures.map((item) => (
          <View key={item.name} style={styles.itemRow}>
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemOwner}>{item.owner}</Text>
            </View>
            <Text style={[styles.status, item.status === "Signed" ? styles.signed : styles.pending]}>{item.status}</Text>
          </View>
        ))}
      </View>

      <Link href="/(app)/productivity" asChild>
        <Text style={styles.link}>Back to productivity</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
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
  signed: {
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
