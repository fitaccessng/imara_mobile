import { Link, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

const pageSections: { title: string; pages: { label: string; route: Href }[] }[] = [
  {
    title: "Personal workspace",
    pages: [
      { label: "Overview", route: "/(app)" },
      { label: "Personal files", route: "/(app)/files" },
      { label: "Smart file library", route: "/(app)/smart-files" },
      { label: "File search", route: "/(app)/file-search" },
      { label: "Favourites", route: "/(app)/file-favorites" },
      { label: "Recycle Bin", route: "/(app)/file-trash" },
      { label: "Notes", route: "/(app)/notes" },
      { label: "Tasks", route: "/(app)/tasks" },
      { label: "Meetings", route: "/(app)/meetings" },
      { label: "Document Studio", route: "/(app)/documents" },
      { label: "File requests", route: "/(app)/file-requests" },
      { label: "Document tools", route: "/(app)/document-tools" },
      { label: "Events", route: "/(app)/events" },
      { label: "Support", route: "/(app)/support" },
      { label: "Account settings", route: "/(app)/account-settings" },
      { label: "Plans and payment", route: "/(app)/billing" },
      { label: "Calendar", route: "/(app)/calendar" },
    ],
  },
  {
    title: "Business workspace",
    pages: [
      { label: "Workspace overview", route: "/(app)/workspace" },
      { label: "Shared and private files", route: "/(app)/workspace-files" },
      { label: "Private file deliveries", route: "/(app)/workspace-file-deliveries" },
      { label: "Shared calendar", route: "/(app)/workspace-calendar" },
      { label: "Workspace forms", route: "/(app)/forms" },
      { label: "People and permissions", route: "/(app)/workspace-team" },
      { label: "Invitations", route: "/(app)/workspace-invitations" },
      { label: "Workspace activity", route: "/(app)/workspace-activity" },
      { label: "Workspace chat", route: "/(app)/workspace-chat" },
      { label: "Workspace approvals", route: "/(app)/workspace-approvals" },
    ],
  },
  {
    title: "Productivity",
    pages: [
      { label: "Productivity hub", route: "/(app)/productivity" },
      { label: "Signatures", route: "/(app)/signatures" },
      { label: "Approval workflow", route: "/(app)/approval-workflow" },
      { label: "Reminders", route: "/(app)/reminders" },
    ],
  },
  {
    title: "Public information",
    pages: [
      { label: "Home", route: "/marketing?page=home" },
      { label: "About", route: "/marketing?page=about" },
      { label: "Features", route: "/marketing?page=features" },
      { label: "Documentation", route: "/marketing?page=docs" },
      { label: "How it works", route: "/marketing?page=how-it-works" },
      { label: "Pricing", route: "/marketing?page=pricing" },
      { label: "Contact", route: "/marketing?page=contact" },
      { label: "Help and FAQ", route: "/marketing?page=faq" },
      { label: "Terms", route: "/marketing?page=terms" },
      { label: "Privacy", route: "/marketing?page=privacy" },
      { label: "Security", route: "/marketing?page=security" },
      { label: "Accessibility", route: "/marketing?page=accessibility" },
    ],
  },
  {
    title: "Communications",
    pages: [
      { label: "Communications hub", route: "/(app)/communications" },
      { label: "Notifications", route: "/(app)/notifications" },
      { label: "Announcements", route: "/(app)/announcements" },
      { label: "Workspace conversations", route: "/(app)/chat" },
    ],
  },
  {
    title: "Native and offline",
    pages: [
      { label: "Device tools", route: "/(app)/native-support" },
      { label: "Notification settings", route: "/(app)/notification-settings" },
      { label: "Biometric verification", route: "/(app)/biometric" },
      { label: "Deep links", route: "/(app)/deep-links" },
      { label: "Document scanner", route: "/(app)/scan" },
      { label: "Offline queue", route: "/(app)/offline-support" },
    ],
  },
];

export default function AllPagesScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>IMARA MOBILE</Text>
        <Text style={styles.title}>All pages</Text>
        <Text style={styles.subtitle}>Every section opens as its own screen.</Text>
      </View>
      {pageSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.links}>
            {section.pages.map((page, index) => (
              <Link key={page.label} href={page.route} asChild>
                <Pressable style={styles.row}>
                  <View style={styles.index}>
                    <Text style={styles.indexText}>{String(index + 1).padStart(2, "0")}</Text>
                  </View>
                  <Text style={styles.rowLabel}>{page.label}</Text>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 14 },
  header: { gap: 8, marginBottom: 5 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  section: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 20, padding: 15, gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  links: { gap: 6 },
  row: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 },
  index: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.greenWash, alignItems: "center", justifyContent: "center" },
  indexText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  rowLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "600" },
  arrow: { color: colors.greenDark, fontSize: 20, fontWeight: "700" },
});
