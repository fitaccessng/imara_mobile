import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandMark } from "@/ui/components";
import { colors } from "@/ui/theme";

const stats = [
  { label: "Shared files", value: "184" },
  { label: "Team members", value: "12" },
  { label: "Approvals", value: "06" },
  { label: "Reminders", value: "03" },
];

const quickLinks = [
  { label: "Shared files", route: "/(app)/workspace-files" },
  { label: "Private deliveries", route: "/(app)/workspace-file-deliveries" },
  { label: "Team access", route: "/(app)/workspace-team" },
  { label: "Chat", route: "/(app)/workspace-chat" },
  { label: "Approvals", route: "/(app)/workspace-approvals" },
];

const activity = [
  { title: "Board pack finalised", detail: "Finance team shared the board pack for review." },
  { title: "New folder added", detail: "Operations created Q4 procurement with inherited access." },
  { title: "Approval requested", detail: "Marketing budget needs sign-off from the leadership team." },
];

export default function WorkspaceOverviewScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>BUSINESS WORKSPACE</Text>
          <Text style={styles.title}>Northstar Studio</Text>
        </View>
        <BrandMark />
      </View>

      <View style={styles.summaryGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.metricCard}>
            <Text style={styles.metricValue}>{stat.value}</Text>
            <Text style={styles.metricLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workspace tools</Text>
        </View>
        <View style={styles.toolGrid}>
          {quickLinks.map((link) => (
            <Link key={link.label} href={link.route as any} asChild>
              <Pressable style={styles.toolCard}>
                <Text style={styles.toolLabel}>{link.label}</Text>
                <Text style={styles.toolArrow}>›</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Text style={styles.sectionAction}>Today</Text>
        </View>
        <View style={styles.activityList}>
          {activity.map((item) => (
            <View key={item.title} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Team priorities</Text>
        </View>
        <View style={styles.priorityCard}>
          <Text style={styles.priorityTitle}>Campaign launch</Text>
          <Text style={styles.priorityDetail}>Final review due before 5:00 PM. Shared assets are ready for approval.</Text>
        </View>
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flexBasis: "48%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  metricLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionAction: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: "700",
  },
  toolGrid: {
    gap: 10,
  },
  toolCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.greenWash,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  toolLabel: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
  },
  toolArrow: {
    color: colors.greenDark,
    fontSize: 20,
    fontWeight: "700",
  },
  activityList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
    marginTop: 7,
  },
  activityCopy: {
    flex: 1,
    gap: 3,
  },
  activityTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  activityDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  priorityCard: {
    backgroundColor: colors.sand,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  priorityTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  priorityDetail: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
});
