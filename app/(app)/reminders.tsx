import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const reminders = [
  { title: "Follow up with vendor", time: "Today · 2:00 PM" },
  { title: "Review onboarding notes", time: "Tomorrow · 9:30 AM" },
  { title: "Send final approval", time: "Friday · 11:00 AM" },
];

export default function RemindersScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>REMINDERS</Text>
        <Text style={styles.title}>Upcoming follow-ups</Text>
      </View>

      <View style={styles.card}>
        {reminders.map((item) => (
          <View key={item.title} style={styles.itemRow}>
            <View style={styles.dot} />
            <View style={styles.copy}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemTime}>{item.time}</Text>
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
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
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
  itemTime: {
    color: colors.muted,
    fontSize: 12,
  },
  link: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
