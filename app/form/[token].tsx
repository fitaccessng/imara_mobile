import { useMutation, useQuery } from "@tanstack/react-query";
import { File as LocalFile } from "expo-file-system";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getPublicWorkspaceForm, submitPublicWorkspaceForm, uploadPublicFormFile, type FormQuestion } from "@/productivity/api";
import { colors } from "@/ui/theme";

export default function PublicFormScreen() {
  const { token = "" } = useLocalSearchParams<{ token: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [uploadingId, setUploadingId] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const formQuery = useQuery({
    queryKey: ["public-workspace-form", token],
    queryFn: () => getPublicWorkspaceForm(token),
    enabled: Boolean(token),
  });
  const submit = useMutation({
    mutationFn: () => submitPublicWorkspaceForm(token, { name: name.trim(), email: email.trim(), answers }),
    onSuccess: () => setSubmitted(true),
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The response could not be submitted."),
  });

  async function pickUpload(questionId: string) {
    setError("");
    try {
      const selected = await LocalFile.pickFileAsync({ mimeTypes: ["application/pdf", "image/png", "image/jpeg"] });
      if (selected.canceled) return;
      setUploadingId(questionId);
      const result = await uploadPublicFormFile(token, questionId, selected.result);
      setAnswers((current) => ({ ...current, [questionId]: result.fileId }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The file could not be uploaded.");
    } finally {
      setUploadingId("");
    }
  }

  function submitForm() {
    setError("");
    const form = formQuery.data;
    if (!form) return;
    const missing = form.schema.questions.find((question) => {
      const value = answers[question.id];
      return question.required && (
        value === undefined
        || value === ""
        || (Array.isArray(value) && value.length === 0)
      );
    });
    if (!name.trim() || !email.trim()) {
      setError("Enter your name and email address.");
      return;
    }
    if (missing) {
      setError(`Complete “${missing.prompt}”.`);
      return;
    }
    submit.mutate();
  }

  if (formQuery.isPending) return <State title="Loading form…" />;
  if (formQuery.isError) return <State title="Form unavailable" detail="This public form link may have expired or been disabled." />;
  const form = formQuery.data;
  const setAnswer = (questionId: string, value: unknown) => setAnswers((current) => ({ ...current, [questionId]: value }));

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {submitted ? <View style={styles.success}><Text style={styles.successTitle}>Response submitted</Text><Text style={styles.body}>Thank you. Your response has been sent to the workspace.</Text></View> : <>
        <View style={styles.header}><Text style={styles.kicker}>IMARA WORKSPACE FORM</Text><Text style={styles.title}>{form.title}</Text>{form.description ? <Text style={styles.body}>{form.description}</Text> : null}</View>
        <View style={styles.card}><Text style={styles.sectionTitle}>Your information</Text><Text style={styles.label}>Name</Text><TextInput maxLength={120} value={name} onChangeText={setName} style={styles.input} placeholder="Your name" /><Text style={styles.label}>Email</Text><TextInput keyboardType="email-address" autoCapitalize="none" maxLength={320} value={email} onChangeText={setEmail} style={styles.input} placeholder="you@example.com" /></View>
        {form.schema.questions.map((question) => <QuestionField key={question.id} question={question} value={answers[question.id]} uploading={uploadingId === question.id} onChange={(value) => setAnswer(question.id, value)} onUpload={() => void pickUpload(question.id)} />)}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable disabled={submit.isPending || Boolean(uploadingId)} onPress={submitForm} style={styles.submit}><Text style={styles.submitText}>{submit.isPending ? "Submitting…" : "Submit response"}</Text></Pressable>
      </>}
    </ScrollView>
  );
}

function QuestionField({
  question,
  value,
  uploading,
  onChange,
  onUpload,
}: {
  question: FormQuestion;
  value: unknown;
  uploading: boolean;
  onChange: (value: unknown) => void;
  onUpload: () => void;
}) {
  return <View style={styles.card}>
    <Text style={styles.sectionTitle}>{question.prompt}{question.required ? <Text style={styles.required}> *</Text> : null}</Text>
    {question.type === "PARAGRAPH" ? <TextInput multiline maxLength={10000} value={typeof value === "string" ? value : ""} onChangeText={onChange} style={[styles.input, styles.multiline]} />
      : question.type === "MULTIPLE_CHOICE" || question.type === "CHECKBOXES" ? (question.choices ?? []).map((choice) => {
        const checked = question.type === "CHECKBOXES" ? Array.isArray(value) && value.includes(choice) : value === choice;
        return <Pressable key={choice} onPress={() => {
          if (question.type === "MULTIPLE_CHOICE") onChange(choice);
          else {
            const current = Array.isArray(value) ? value as string[] : [];
            onChange(checked ? current.filter((item) => item !== choice) : [...current, choice]);
          }
        }} style={styles.choice}><Text style={styles.checkmark}>{checked ? "☑" : "□"}</Text><Text style={styles.body}>{choice}</Text></Pressable>;
      })
        : question.type === "FILE_UPLOAD" ? <><Pressable onPress={onUpload} disabled={uploading} style={styles.upload}><Text style={styles.uploadText}>{uploading ? "Uploading…" : value ? "Choose another file" : "Choose PDF, PNG or JPEG"}</Text></Pressable>{value ? <Text style={styles.meta}>File uploaded.</Text> : <Text style={styles.meta}>Maximum file size: 5 MiB.</Text>}</>
          : <TextInput keyboardType={question.type === "NUMBER" ? "numeric" : question.type === "EMAIL" ? "email-address" : "default"} autoCapitalize={question.type === "EMAIL" ? "none" : "sentences"} maxLength={question.type === "EMAIL" ? 320 : 2000} value={typeof value === "string" || typeof value === "number" ? String(value) : ""} onChangeText={(text) => onChange(question.type === "NUMBER" && text ? Number(text) : text)} style={styles.input} />}
  </View>;
}

function State({ title, detail }: { title: string; detail?: string }) {
  return <View style={styles.state}>{!detail ? <ActivityIndicator color={colors.green} /> : null}<Text style={styles.sectionTitle}>{title}</Text>{detail ? <Text style={styles.body}>{detail}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 20, paddingBottom: 36, gap: 12 },
  header: { gap: 7, marginBottom: 3 },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "800" },
  body: { color: colors.text, fontSize: 11, lineHeight: 17 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 13, gap: 8 },
  sectionTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  choice: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 30 },
  checkmark: { color: colors.greenDark, fontSize: 14, fontWeight: "800" },
  required: { color: colors.red },
  upload: { borderWidth: 1, borderColor: colors.line, borderRadius: 9, padding: 11, alignItems: "center" },
  uploadText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 8 },
  submit: { backgroundColor: colors.green, borderRadius: 11, alignItems: "center", padding: 13 },
  submitText: { color: colors.surface, fontSize: 11, fontWeight: "800" },
  error: { color: colors.red, fontSize: 10, lineHeight: 15 },
  success: { alignItems: "center", gap: 8, padding: 24, backgroundColor: colors.surface, borderRadius: 16 },
  successTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, padding: 24 },
});
