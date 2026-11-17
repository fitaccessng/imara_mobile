import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const items = [
  { title: "Inbox", route: "/(app)/notifications", detail: "System and team alerts" },
  { title: "Announcements", route: "/(app)/announcements", detail: "Latest updates from your workspace" },
  { title: "Team chat", route: "/(app)/chat", detail: "Messages and conversations" },
  { title: "Offline mode", route: "/(app)/offline-support", detail: "Sync and local access" },
  { title: "Native tools", route: "/(app)/native-support", detail: "Notifications, biometrics, and scanning" },
  { title: "All pages", route: "/(app)/all-pages", detail: "Open every mobile screen directly" },
];

export default function CommunicationsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>COMMUNICATIONS</Text>
        <Text style={styles.title}>Updates & conversations</Text>
      </View>

      <View style={styles.cardGrid}>
        {items.map((item) => (
          <Link key={item.title} href={item.route as any} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDetail}>{item.detail}</Text>
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
  cardGrid: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 6,
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
