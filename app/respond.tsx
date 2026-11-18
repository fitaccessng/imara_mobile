import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getPublicDocument, signPublicDocument, submitPublicDocumentForm } from "@/public/api";
import { colors } from "@/ui/theme";

export default function PublicDocumentRoute() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState('{"answer":""}');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const query = useQuery({ queryKey: ["public-document", token], queryFn: () => getPublicDocument(token), enabled: Boolean(token) });

  const submitForm = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Enter your name.");
      if (!email.trim()) throw new Error("Enter your email address.");
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(answers) as Record<string, unknown>; } catch { throw new Error("Answers must be valid JSON."); }
      return submitPublicDocumentForm(token, { name: name.trim(), email: email.trim(), answers: parsed });
    },
    onSuccess: () => { setSubmitted(true); setError(""); },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The response could not be submitted."),
  });

  const sign = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Enter your name.");
      if (!email.trim()) throw new Error("Enter your email address.");
      if (!consent) throw new Error("You must consent to sign this agreement.");
      return signPublicDocument(token, { name: name.trim(), email: email.trim(), consent });
    },
    onSuccess: () => { setSubmitted(true); setError(""); },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The agreement could not be signed."),
  });

  if (!token) return <View style={styles.page}><View style={styles.card}><Text style={styles.error}>No public document token was found.</Text></View></View>;
  if (query.isPending) return <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.title}>Opening document…</Text></View>;
  if (query.isError) return <View style={styles.page}><View style={styles.card}><Text style={styles.title}>Document unavailable</Text><Text style={styles.subtitle}>{message(query.error)}</Text><Pressable onPress={() => void query.refetch()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Try again</Text></Pressable></View></View>;

  const document = query.data;
  return (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.card}>
        <Text style={styles.kicker}>PUBLIC DOCUMENT</Text><Text style={styles.title}>{document.title}</Text>{document.description ? <Text style={styles.subtitle}>{document.description}</Text> : null}
        {submitted ? <Text style={styles.success}>{document.type === "AGREEMENT" ? "Agreement response recorded." : "Response submitted."}</Text> : (
          <>
            <Text style={styles.label}>Name</Text><TextInput maxLength={120} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input} />
            <Text style={styles.label}>Email</Text><TextInput autoCapitalize="none" keyboardType="email-address" maxLength={320} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={styles.input} />
            {document.type === "FORM" ? <><Text style={styles.label}>Answers JSON</Text><TextInput multiline maxLength={50000} value={answers} onChangeText={setAnswers} autoCapitalize="none" autoCorrect={false} placeholder='{"answer":""}' placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} /><Pressable disabled={submitForm.isPending} onPress={() => { setError(""); submitForm.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{submitForm.isPending ? "Submitting…" : "Submit response"}</Text></Pressable></> : null}
            {document.type === "AGREEMENT" ? <><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent((value) => !value)} style={styles.consentRow}><View style={[styles.checkbox, consent ? styles.checkboxActive : null]}><Text style={styles.checkmark}>{consent ? "✓" : ""}</Text></View><Text style={styles.consentText}>I consent to this electronic signature and record.</Text></Pressable><Pressable disabled={sign.isPending} onPress={() => { setError(""); sign.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{sign.isPending ? "Signing…" : "Consent and sign"}</Text></Pressable></> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function message(error: unknown): string { return error instanceof Error ? error.message : "The link may be invalid or revoked."; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: 18 }, pageContent: { flexGrow: 1, backgroundColor: colors.background, padding: 18, justifyContent: "center" }, state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, card: { gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface, padding: 20 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17 }, label: { color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 2 }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.background, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 }, multiline: { minHeight: 120, textAlignVertical: "top", fontFamily: "monospace" }, primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800" }, consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 }, checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }, checkboxActive: { backgroundColor: colors.green, borderColor: colors.green }, checkmark: { color: colors.surface, fontSize: 10, fontWeight: "800" }, consentText: { flex: 1, color: colors.text, fontSize: 10, lineHeight: 15 }, success: { color: colors.greenDark, backgroundColor: colors.greenWash, borderRadius: 9, padding: 10, fontSize: 10, fontWeight: "700" }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 9, fontSize: 10 },
});
