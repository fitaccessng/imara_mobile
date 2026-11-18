import * as Linking from "expo-linking";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const examples = [
  { route: "/(app)", label: "Overview" },
  { route: "/(app)/notifications", label: "Notifications" },
  { route: "/(app)/announcements", label: "Announcements" },
  { route: "/(app)/communications", label: "Communications" },
];

export default function DeepLinksScreen() {
  const scheme = Linking.createURL("/");

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text style={styles.kicker}>APP LINKS</Text>
      <Text style={styles.title}>Deep-link routes</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Installed app scheme</Text>
        <Text selectable style={styles.scheme}>{scheme}</Text>
        <Text style={styles.detail}>Expo Router handles internal routes when IMARA is installed and the user is signed in.</Text>
      </View>
      <Text style={styles.sectionTitle}>Open a page</Text>
      {examples.map((item) => (
        <Link key={item.label} href={item.route as any} asChild>
          <Pressable style={styles.routeRow}>
            <Text style={styles.routeLabel}>{item.label}</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </Link>
      ))}
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Website token mapping</Text>
        <Text style={styles.detail}>/workspace/invitations/accept, /share/:token, /respond/:token, /request/:token, /capture/:token and /gallery/:token are assigned to dedicated mobile routes. Expo receives the final token parameter at the app route boundary.</Text>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Production association still required</Text>
        <Text style={styles.detail}>Universal Links/App Links for website email URLs need domain association files and native build configuration. This screen does not claim that external domains are associated.</Text>
      </View>
      <Link href="/(app)/native-support" asChild><Pressable><Text style={styles.link}>Back to device tools</Text></Pressable></Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 12 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.5, marginBottom: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  scheme: { color: colors.greenDark, fontSize: 14, fontWeight: "700" },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "700", marginTop: 5 },
  routeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, paddingVertical: 13 },
  routeLabel: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  arrow: { color: colors.greenDark, fontSize: 20, fontWeight: "700" },
  notice: { backgroundColor: colors.greenWash, borderRadius: 18, padding: 16, gap: 7, marginTop: 4 },
  noticeTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  link: { color: colors.greenDark, fontSize: 13, fontWeight: "700", textAlign: "center", paddingVertical: 8 },
});
