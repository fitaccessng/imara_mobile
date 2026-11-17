import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandMark } from "@/ui/components";
import { colors } from "@/ui/theme";

const dayEvents = [
  { time: "09:30", title: "Team sync", detail: "Quarterly planning and status review", badge: "Confirmed" },
  { time: "11:00", title: "Approval review", detail: "Budget draft sign-off", badge: "Pending" },
  { time: "14:15", title: "Design handoff", detail: "Marketing pack for launch", badge: "Due today" },
  { time: "16:45", title: "Client check-in", detail: "Follow-up call with Northstar Studio", badge: "Booked" },
];

export default function CalendarScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>CALENDAR</Text>
          <Text style={styles.title}>Agenda</Text>
        </View>
        <BrandMark />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>4</Text>
        <Text style={styles.summaryLabel}>Events scheduled today</Text>
      </View>

      <View style={styles.timeline}>
        {dayEvents.map((event) => (
          <View key={`${event.time}-${event.title}`} style={styles.timelineCard}>
            <View style={styles.timeColumn}>
              <Text style={styles.time}>{event.time}</Text>
            </View>
            <View style={styles.eventBody}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDetail}>{event.detail}</Text>
            </View>
            <View style={styles.badgeWrap}>
              <Text style={styles.badge}>{event.badge}</Text>
            </View>
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderColor: colors.line,
    borderWidth: 1,
    padding: 18,
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "700",
  },
  summaryLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  timeline: {
    gap: 12,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeColumn: {
    width: 52,
  },
  time: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  eventBody: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  eventDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  badgeWrap: {
    backgroundColor: colors.greenWash,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  badge: {
    color: colors.greenDark,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
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
