import { useLocalSearchParams } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";
import { getWebBaseUrl } from "@/config";

const pages: Record<string, { eyebrow: string; title: string; intro: string; sections: { title: string; body: string }[] }> = {
  home: { eyebrow: "IMARA", title: "A secure place for work", intro: "Keep files, teams, signatures and approvals connected in one mobile workspace.", sections: [{ title: "Files", body: "Browse, share and organize personal and business files." }, { title: "Teamwork", body: "Use roles and folder permissions designed for controlled collaboration." }, { title: "Workflows", body: "Review approvals, reminders, signatures and event galleries." }] },
  about: { eyebrow: "ABOUT IMARA", title: "Made for connected work", intro: "IMARA brings personal storage and business collaboration into one secure platform.", sections: [{ title: "Our purpose", body: "Make important documents and team activity easier to find, share and protect." }] },
  features: { eyebrow: "FEATURES", title: "One focused workspace", intro: "Essential tools for files, teams and document workflows.", sections: [{ title: "Personal files", body: "Storage, folders, search, favorites, trash and document tools." }, { title: "Business teams", body: "Members, roles, folder permissions, chat and shared calendars." }, { title: "Document actions", body: "Signatures, approvals, reminders and public collection links." }] },
  docs: { eyebrow: "DOCUMENTATION", title: "Find the right workflow", intro: "Use this guide to navigate the mobile application.", sections: [{ title: "Start in Overview", body: "Use overview for account, workspace and recent activity." }, { title: "Use Files", body: "Open folders, search content and download or share authorized files." }, { title: "Manage Workflows", body: "Open Productivity for signatures, approvals and reminders." }] },
  "how-it-works": { eyebrow: "HOW IT WORKS", title: "Create. Share. Complete.", intro: "Move work from creation to team review without losing the record.", sections: [{ title: "Create", body: "Upload or generate files, documents and events." }, { title: "Share", body: "Invite teammates or send public links only when the server authorizes it." }, { title: "Complete", body: "Sign, approve and track the next step from your device." }] },
  pricing: { eyebrow: "PLANS", title: "Choose the right plan", intro: "Compare plans in the account billing screen. Server entitlement values remain authoritative.", sections: [{ title: "Personal", body: "For individual storage and private organization." }, { title: "Pro", body: "For advanced planning and collaboration." }, { title: "Business", body: "For workspace roles, members and team controls." }] },
  contact: { eyebrow: "CONTACT", title: "Get help", intro: "Create a support ticket from your signed-in account.", sections: [{ title: "Support tickets", body: "Add the subject, category and issue details to start a conversation." }] },
  help: { eyebrow: "HELP CENTRE", title: "Guidance and answers", intro: "Find account, file and workflow help.", sections: [{ title: "Files", body: "Use file search or favorites when a document is difficult to locate." }, { title: "Workspaces", body: "Check your role and folder permissions with the server-authorized team tools." }, { title: "Account", body: "Use Account Settings for profile, password and sessions." }] },
  faq: { eyebrow: "FAQ", title: "Common questions", intro: "Short answers to common IMARA mobile questions.", sections: [{ title: "Are web and mobile synchronized?", body: "Yes. The app uses the existing IMARA accounts, storage and APIs; local state is only a cache." }, { title: "Who controls permissions?", body: "The IMARA server. The app does not grant access by hiding an action locally." }, { title: "Why is a device workflow still limited?", body: "Native permission, cookie and device behavior must be validated on iOS and Android builds." }] },
  terms: { eyebrow: "LEGAL", title: "Terms of use", intro: "Use IMARA in line with the applicable account and workspace terms.", sections: [{ title: "Account responsibility", body: "Protect your login, verify recipients and do not upload content without permission." }, { title: "Electronic signatures", body: "Electronic signature workflows record consent but do not claim qualified legal-signature status." }] },
  privacy: { eyebrow: "LEGAL", title: "Privacy", intro: "IMARA processes account, file and workspace data according to the platform policy.", sections: [{ title: "Data protection", body: "Use the website privacy policy for the authoritative description of collection and processing." }, { title: "Device data", body: "The app may keep private sessions and offline queue metadata on this device." }] },
  security: { eyebrow: "SECURITY", title: "Security overview", intro: "Server permissions, protected sessions and native device controls protect account workflows.", sections: [{ title: "Session protection", body: "Authenticated requests use the existing server session mechanism." }, { title: "Device controls", body: "Biometric checks can protect app access but do not replace server authentication." }] },
  accessibility: { eyebrow: "ACCESSIBILITY", title: "Accessible mobile use", intro: "The mobile app uses clear labels, touch targets and platform-native controls.", sections: [{ title: "System support", body: "Use your device text size, screen reader and contrast settings for the best experience." }] },
};

export default function MarketingRoute() {
  const params = useLocalSearchParams<{ page?: string }>();
  const pageKey = typeof params.page === "string" ? params.page : "home";
  const page = pages[pageKey] ?? pages.home;

  async function openWebsite() {
    await Linking.openURL(`${getWebBaseUrl()}/${pageKey === "home" ? "" : pageKey}`);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>{page.eyebrow}</Text>
      <Text style={styles.title}>{page.title}</Text>
      <Text style={styles.intro}>{page.intro}</Text>
      {page.sections.map((section) => (
        <View key={section.title} style={styles.card}><Text style={styles.cardTitle}>{section.title}</Text><Text style={styles.body}>{section.body}</Text></View>
      ))}
      {pageKey === "contact" ? <Pressable onPress={() => Linking.openURL(`${getWebBaseUrl()}/support`)} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Open support on the web</Text></Pressable> : <Pressable onPress={() => void openWebsite()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Open full page</Text></Pressable>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 24, paddingBottom: 36, gap: 12, backgroundColor: colors.background },
  eyebrow: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 31, lineHeight: 38, fontWeight: "800" },
  intro: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  card: { gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.surface, padding: 15 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  body: { color: colors.text, fontSize: 11, lineHeight: 17 },
  primaryButton: { backgroundColor: colors.green, borderRadius: 11, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  primaryButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800" },
});
