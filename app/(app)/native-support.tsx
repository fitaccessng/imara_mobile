import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const tools = [
  { title: "Notification settings", detail: "Manage this device’s notification permission", route: "/(app)/notification-settings" },
  { title: "Biometric verification", detail: "Check and verify with device biometrics", route: "/(app)/biometric" },
  { title: "Deep links", detail: "Review app-link support and routes", route: "/(app)/deep-links" },
  { title: "Document scanner", detail: "Capture and upload a document", route: "/(app)/scan" },
  { title: "Offline support", detail: "Review local queue and connection status", route: "/(app)/offline-support" },
];

export default function NativeSupportScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>NATIVE SUPPORT</Text>
        <Text style={styles.title}>Device tools</Text>
        <Text style={styles.subtitle}>Each tool opens in its own screen.</Text>
      </View>
      {tools.map((tool, index) => (
        <Link key={tool.title} href={tool.route as any} asChild>
          <Pressable style={styles.card}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{String(index + 1).padStart(2, "0")}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.cardTitle}>{tool.title}</Text>
              <Text style={styles.cardDetail}>{tool.detail}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 12 },
  header: { gap: 8, marginBottom: 6 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14 },
  number: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.greenWash, alignItems: "center", justifyContent: "center" },
  numberText: { color: colors.greenDark, fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  copy: { flex: 1, gap: 4 },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  cardDetail: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  arrow: { color: colors.greenDark, fontSize: 22, fontWeight: "700" },
});
