import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandMark } from "@/ui/components";
import { colors } from "@/ui/theme";

const toolCards = [
  { title: "IMARA Tasks", route: "/(app)/tasks", detail: "Assign work, set deadlines and attach files" },
  { title: "Meeting Room", route: "/(app)/meetings", detail: "Record meetings and track decisions and action items" },
  { title: "Workspace Forms", route: "/(app)/forms", detail: "Build shareable forms and collect responses" },
  { title: "Signatures", route: "/(app)/signatures", detail: "Review and sign documents" },
  { title: "Approvals", route: "/(app)/approval-workflow", detail: "Track review decisions" },
  { title: "Reminders", route: "/(app)/reminders", detail: "Stay on top of follow-ups" },
  { title: "Workflow history", route: "/(app)/approval-workflow", detail: "Audit actions and timing" },
];

export default function ProductivityScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>PRODUCTIVITY</Text>
          <Text style={styles.title}>Workflows & follow-ups</Text>
        </View>
        <BrandMark />
      </View>

      <View style={styles.grid}>
        {toolCards.map((card) => (
          <Link key={card.title} href={card.route as any} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDetail}>{card.detail}</Text>
              <Text style={styles.cardArrow}>›</Text>
            </Pressable>
          </Link>
        ))}
      </View>
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
    paddingBottom: 40,
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  summaryLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 8,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  cardDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  cardArrow: {
    color: colors.greenDark,
    fontSize: 22,
    fontWeight: "700",
    alignSelf: "flex-end",
  },
});
