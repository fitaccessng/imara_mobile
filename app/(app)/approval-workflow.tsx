import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const workflowSteps = [
  { step: "1", title: "Submitted for review", detail: "Finance draft was sent on 08:30 AM." },
  { step: "2", title: "Reviewed by team", detail: "Operations and marketing left comments." },
  { step: "3", title: "Awaiting sign-off", detail: "Leadership final approval is still pending." },
  { step: "4", title: "Completed", detail: "This step is locked after approval is granted." },
];

export default function ApprovalWorkflowScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>APPROVAL WORKFLOW</Text>
        <Text style={styles.title}>Review state</Text>
      </View>

      <View style={styles.card}>
        {workflowSteps.map((item) => (
          <View key={item.step} style={styles.stepRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.step}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepDetail}>{item.detail}</Text>
            </View>
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
    gap: 14,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.greenWash,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "700",
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  stepDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
