import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/ui/theme";

export default function DocumentToolsScreen() {
  const [mode, setMode] = useState<"images-pdf" | "pdf-images" | "docx-pdf" | "pdf-docx">("images-pdf");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function convert() {
    setError("");
    setSuccess("");
    if (mode !== "images-pdf") {
      setError("This direction is not available natively yet. Preserve-layout PDF/DOCX conversion requires a server conversion service or verified mobile library.");
      return;
    }
    setWorking(true);
    try {
      const selected = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp"], multiple: true, copyToCacheDirectory: true });
      if (selected.canceled) return;
      if (selected.assets.length === 0) throw new Error("No images were selected.");
      if (selected.assets.length > 8) throw new Error("Choose up to 8 images.");
      const pages: string[] = [];
      for (const asset of selected.assets) {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(reader.error ?? new Error("Could not read an image."));
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.readAsDataURL(blob);
        });
        pages.push(`<div style="page-break-after:always;width:100%;height:100%;display:flex;align-items:center;justify-content:center"><img src="${dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain" /></div>`);
      }
      const uri = await Print.printToFileAsync({ html: `<html><body style="margin:0">${pages.join("")}</body></html>`, base64: false });
      if (!(await Sharing.isAvailableAsync())) throw new Error("Document sharing is not available on this device.");
      await Sharing.shareAsync(uri.uri, { mimeType: "application/pdf", dialogTitle: "Converted PDF" });
      setSuccess("Images converted to PDF and handed to the share sheet.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The files could not be converted.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}><Text style={styles.kicker}>DOCUMENT TOOLS</Text><Text style={styles.title}>Local conversion</Text><Text style={styles.subtitle}>Nothing is uploaded. Supported native conversion stays on this device.</Text></View>
      <Text style={styles.label}>Conversion direction</Text>
      <View style={styles.grid}>
        {(["images-pdf", "pdf-images", "docx-pdf", "pdf-docx"] as const).map((item) => (
          <Pressable key={item} onPress={() => { setMode(item); setError(""); setSuccess(""); }} style={[styles.modeCard, mode === item ? styles.modeSelected : null]}>
            <Text style={[styles.modeTitle, mode === item ? styles.modeTitleSelected : null]}>{modeLabel(item)}</Text><Text style={styles.modeDetail}>{modeDetail(item)}</Text>
          </Pressable>
        ))}
      </View>
      {mode !== "images-pdf" ? <View style={styles.notice}><Text style={styles.noticeTitle}>Not available natively yet</Text><Text style={styles.noticeText}>PDF-to-images, Word-to-PDF and PDF-to-Word require a verified server or local conversion engine. This UI does not claim or silently approximate layout fidelity.</Text></View> : <View style={styles.notice}><Text style={styles.noticeTitle}>Native support</Text><Text style={styles.noticeText}>Up to 8 JPG, PNG or WebP images are combined into a PDF and handed to the system share sheet.</Text></View>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <Pressable disabled={working} onPress={() => void convert()} style={[styles.primaryButton, working ? styles.disabled : null]}><Text style={styles.primaryButtonText}>{working ? "Converting…" : mode === "images-pdf" ? "Choose images" : "Not available"}</Text></Pressable>
    </ScrollView>
  );
}

function modeLabel(mode: "images-pdf" | "pdf-images" | "docx-pdf" | "pdf-docx"): string {
  return mode === "images-pdf" ? "Images to PDF" : mode === "pdf-images" ? "PDF to images" : mode === "docx-pdf" ? "Word to PDF" : "PDF to Word";
}
function modeDetail(mode: "images-pdf" | "pdf-images" | "docx-pdf" | "pdf-docx"): string {
  return mode === "images-pdf" ? "JPG · PNG · WebP" : mode === "pdf-images" ? "Local engine required" : mode === "docx-pdf" ? "Not yet available" : "Preserve-layout engine required";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { gap: 4 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 }, label: { color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 2 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, modeCard: { width: "48%", minHeight: 82, gap: 5, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11 }, modeSelected: { borderColor: colors.green, backgroundColor: colors.greenWash }, modeTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" }, modeTitleSelected: { color: colors.greenDark }, modeDetail: { color: colors.muted, fontSize: 8, lineHeight: 13 }, notice: { gap: 5, borderRadius: 12, backgroundColor: colors.greenWash, padding: 12 }, noticeTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" }, noticeText: { color: colors.muted, fontSize: 9, lineHeight: 15 }, primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800" }, disabled: { opacity: 0.55 }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 9, fontSize: 10 }, success: { color: colors.greenDark, backgroundColor: colors.greenWash, borderRadius: 9, padding: 9, fontSize: 10, fontWeight: "700" },
});
