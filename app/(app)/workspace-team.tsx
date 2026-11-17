import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const members = [
  { name: "Aisha Okafor", role: "Workspace admin", status: "Online", initials: "AO" },
  { name: "Daniel Kim", role: "Finance lead", status: "In review", initials: "DK" },
  { name: "Nia Brooks", role: "Marketing", status: "Available", initials: "NB" },
  { name: "Samuel Reed", role: "Operations", status: "Offline", initials: "SR" },
];

const activity = [
  "Aisha granted inherited access to the procurement subfolder.",
  "Nia shared the launch brief with the marketing team.",
  "Daniel approved the board pack and archived the prior revision.",
];

export default function WorkspaceTeamScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>TEAM ACCESS</Text>
        <Text style={styles.title}>People & permissions</Text>
      </View>

      <View style={styles.section}>
        {members.map((member) => (
          <View key={member.name} style={styles.memberRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member.initials}</Text>
            </View>
            <View style={styles.memberBody}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </View>
            <Text style={styles.status}>{member.status}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity log</Text>
        <View style={styles.logList}>
          {activity.map((entry) => (
            <View key={entry} style={styles.logRow}>
              <View style={styles.logDot} />
              <Text style={styles.logText}>{entry}</Text>
            </View>
          ))}
        </View>
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
  section: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenWash,
  },
  avatarText: {
    color: colors.greenDark,
    fontSize: 13,
    fontWeight: "700",
  },
  memberBody: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  memberRole: {
    color: colors.muted,
    fontSize: 12,
  },
  status: {
    color: colors.greenDark,
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: colors.greenWash,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  logList: {
    gap: 10,
  },
  logRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
    marginTop: 7,
  },
  logText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
