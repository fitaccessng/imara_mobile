import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";

import { getWorkspaces } from "@/communications/api";
import {
  deleteWorkspaceForm,
  getWorkspaceFormResponses,
  getWorkspaceForms,
  revokeWorkspaceForm,
  saveWorkspaceForm,
  shareWorkspaceForm,
  type FormQuestion,
  type FormQuestionType,
  type FormResponse,
  type WorkspaceForm,
} from "@/productivity/api";
import { colors } from "@/ui/theme";

const questionTypes: FormQuestionType[] = ["SHORT_ANSWER", "PARAGRAPH", "EMAIL", "NUMBER", "MULTIPLE_CHOICE", "CHECKBOXES", "FILE_UPLOAD"];

type QuestionDraft = FormQuestion & { choicesText: string };

function freshQuestion(index: number): QuestionDraft {
  return { id: `question-${Date.now()}-${index}`, prompt: "", type: "SHORT_ANSWER", required: false, choicesText: "" };
}

function toQuestions(form: WorkspaceForm): QuestionDraft[] {
  return form.schema.questions.map((question) => ({ ...question, choicesText: question.choices?.join("\n") ?? "" }));
}

export default function FormsScreen() {
  const route = useLocalSearchParams<{ workspaceId?: string }>();
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<string | null>(route.workspaceId ?? null);
  const [editing, setEditing] = useState<WorkspaceForm | null>(null);
  const [selected, setSelected] = useState<WorkspaceForm | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [error, setError] = useState("");

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  useEffect(() => {
    if (route.workspaceId) setWorkspaceId(route.workspaceId);
  }, [route.workspaceId]);
  useEffect(() => {
    if (!workspaceId && workspacesQuery.data?.[0]) setWorkspaceId(workspacesQuery.data[0].id);
  }, [workspaceId, workspacesQuery.data]);
  const formsQuery = useQuery({
    queryKey: ["workspace-forms", workspaceId],
    queryFn: () => getWorkspaceForms(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const responsesQuery = useQuery({
    queryKey: ["workspace-form-responses", workspaceId, selected?.id],
    queryFn: () => getWorkspaceFormResponses(workspaceId!, selected!.id),
    enabled: Boolean(workspaceId && selected),
  });
  const forms = formsQuery.data ?? [];
  const currentForm = selected ? forms.find((form) => form.id === selected.id) : null;

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["workspace-forms", workspaceId] }),
    selected ? queryClient.invalidateQueries({ queryKey: ["workspace-form-responses", workspaceId, selected.id] }) : Promise.resolve(),
  ]);
  const save = useMutation({
    mutationFn: () => {
      if (!workspaceId) throw new Error("Choose a business workspace.");
      if (!title.trim()) throw new Error("Add a form title.");
      if (!questions.length || questions.some((question) => !question.prompt.trim())) {
        throw new Error("Add at least one question and give each question a prompt.");
      }
      if (questions.some((question) =>
        (question.type === "MULTIPLE_CHOICE" || question.type === "CHECKBOXES")
        && !question.choicesText.split("\n").some((choice) => choice.trim()),
      )) {
        throw new Error("Add at least one option to each choice question.");
      }
      const schemaQuestions: FormQuestion[] = questions.map(({ choicesText, ...question }) => ({
        ...question,
        prompt: question.prompt.trim(),
        ...(["MULTIPLE_CHOICE", "CHECKBOXES"].includes(question.type)
          ? { choices: choicesText.split("\n").map((choice) => choice.trim()).filter(Boolean) }
          : {}),
      }));
      return saveWorkspaceForm(workspaceId, {
        title: title.trim(),
        description: description.trim() || null,
        schema: { questions: schemaQuestions },
      }, editing?.id);
    },
    onSuccess: async (form) => {
      setSelected(form);
      setOpen(false);
      setError("");
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The form could not be saved."),
  });
  const share = useMutation({
    mutationFn: (id: string) => shareWorkspaceForm(workspaceId!, id),
    onSuccess: async ({ token }) => {
      const webUrl = Constants.expoConfig?.extra?.webUrl;
      const link = `${typeof webUrl === "string" ? webUrl.replace(/\/$/, "") : "https://useimara.space"}/form/${token}`;
      try {
        await Share.share({ message: link, url: link, title: "IMARA form link" });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The form link was created but could not be shared.");
      }
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The form link could not be created."),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeWorkspaceForm(workspaceId!, id),
    onSuccess: refresh,
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The form link could not be disabled."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteWorkspaceForm(workspaceId!, id),
    onSuccess: async () => { setSelected(null); await refresh(); },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The form could not be deleted."),
  });

  function startCreate() {
    setEditing(null);
    setSelected(null);
    setTitle("");
    setDescription("");
    setQuestions([freshQuestion(0)]);
    setError("");
    setOpen(true);
  }

  function startEdit(form: WorkspaceForm) {
    setEditing(form);
    setSelected(form);
    setTitle(form.title);
    setDescription(form.description ?? "");
    setQuestions(toQuestions(form));
    setError("");
    setOpen(true);
  }

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  }

  function confirmDelete(form: WorkspaceForm) {
    Alert.alert("Delete form?", `${form.title} and its responses will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(form.id) },
    ]);
  }

  if (workspacesQuery.isPending) return <State title="Loading workspaces…" />;
  if (workspacesQuery.isError) return <State title="Workspaces couldn’t load" detail={message(workspacesQuery.error)} retry={() => void workspacesQuery.refetch()} />;
  const workspaces = workspacesQuery.data ?? [];
  if (!workspaceId) return <State title="No business workspace" detail="Join a business workspace to create shareable forms." />;
  if (formsQuery.isPending) return <State title="Loading forms…" />;
  if (formsQuery.isError) return <State title="Forms couldn’t load" detail={message(formsQuery.error)} retry={() => void formsQuery.refetch()} />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.kicker}>BUSINESS WORKSPACE</Text><Text style={styles.title}>Forms</Text><Text style={styles.subtitle}>Build forms, share a link and collect workspace responses.</Text></View><Pressable onPress={startCreate} style={styles.primary}><Text style={styles.primaryText}>＋ New</Text></Pressable></View>
      {workspaces.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopes}>{workspaces.map((workspace) => <Pressable key={workspace.id} onPress={() => { setWorkspaceId(workspace.id); setSelected(null); }} style={[styles.scope, workspace.id === workspaceId && styles.scopeActive]}><Text style={[styles.scopeText, workspace.id === workspaceId && styles.scopeTextActive]}>{workspace.name}</Text></Pressable>)}</ScrollView> : null}
      {forms.length ? forms.map((form) => <View key={form.id} style={styles.card}>
        <Pressable onPress={() => setSelected(form)}><Text style={styles.cardTitle}>{form.title}</Text><Text style={styles.meta}>{form.schema.questions.length} questions · {form.responseCount} responses · {form.shareActive ? "Shared" : "Draft"}</Text>{form.description ? <Text style={styles.body}>{form.description}</Text> : null}</Pressable>
        <View style={styles.actions}><Pressable onPress={() => startEdit(form)} style={styles.secondary}><Text style={styles.secondaryText}>Edit</Text></Pressable><Pressable disabled={share.isPending} onPress={() => share.mutate(form.id)} style={styles.secondary}><Text style={styles.secondaryText}>{form.shareActive ? "New link" : "Share"}</Text></Pressable>{form.shareActive ? <Pressable disabled={revoke.isPending} onPress={() => revoke.mutate(form.id)} style={styles.secondary}><Text style={styles.secondaryText}>Disable</Text></Pressable> : null}<Pressable onPress={() => confirmDelete(form)} style={styles.delete}><Text style={styles.deleteText}>Delete</Text></Pressable></View>
      </View>) : <View style={styles.empty}><Text style={styles.cardTitle}>No forms yet</Text><Text style={styles.subtitle}>Create a registration, survey or document submission form.</Text><Pressable onPress={startCreate} style={styles.secondary}><Text style={styles.secondaryText}>Create form</Text></Pressable></View>}
      {selected && !open ? <View style={styles.card}><Text style={styles.cardTitle}>Responses · {currentForm?.title ?? selected.title}</Text>{responsesQuery.isPending ? <ActivityIndicator color={colors.green} /> : responsesQuery.isError ? <Text style={styles.error}>{message(responsesQuery.error)}</Text> : (responsesQuery.data ?? []).length ? (responsesQuery.data ?? []).map((response: FormResponse) => <View key={response.id} style={styles.response}><Text style={styles.responseName}>{response.respondentName}</Text><Text style={styles.meta}>{response.respondentEmail} · {dateLabel(response.submittedAt)}</Text>{selected.schema.questions.map((question) => <Text key={question.id} style={styles.body}>{question.prompt}: {answerLabel(response.answers[question.id])}</Text>)}</View>) : <Text style={styles.meta}>No responses submitted yet.</Text>}</View> : null}
      {error && !open ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}><View style={styles.sheet}><View style={styles.grabber} /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
          <Text style={styles.kicker}>FORM BUILDER</Text><Text style={styles.sheetTitle}>{editing ? "Edit form" : "Create a form"}</Text>
          <Text style={styles.label}>Title</Text><TextInput maxLength={160} value={title} onChangeText={setTitle} style={styles.input} placeholder="Form title" />
          <Text style={styles.label}>Description</Text><TextInput multiline maxLength={1000} value={description} onChangeText={setDescription} style={[styles.input, styles.multilineShort]} placeholder="What is this form for?" />
          {questions.map((question, index) => <View key={question.id} style={styles.questionCard}><View style={styles.questionHeading}><Text style={styles.label}>Question {index + 1}</Text><Pressable onPress={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Text style={styles.deleteText}>Remove</Text></Pressable></View>
            <TextInput maxLength={500} value={question.prompt} onChangeText={(prompt) => updateQuestion(index, { prompt })} placeholder="Question prompt" style={styles.input} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopes}>{questionTypes.map((type) => <Pressable key={type} onPress={() => updateQuestion(index, { type, choicesText: "" })} style={[styles.scope, question.type === type && styles.scopeActive]}><Text style={[styles.scopeText, question.type === type && styles.scopeTextActive]}>{type.replace("_", " ")}</Text></Pressable>)}</ScrollView>
            {question.type === "MULTIPLE_CHOICE" || question.type === "CHECKBOXES" ? <TextInput multiline value={question.choicesText} onChangeText={(choicesText) => updateQuestion(index, { choicesText })} placeholder="Options, one per line" style={[styles.input, styles.multilineShort]} /> : null}
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: question.required }} onPress={() => updateQuestion(index, { required: !question.required })} style={styles.requiredRow}><Text style={styles.checkmark}>{question.required ? "☑" : "□"}</Text><Text style={styles.body}>Required</Text></Pressable>
          </View>)}
          <Pressable onPress={() => setQuestions((current) => [...current, freshQuestion(current.length)])} style={styles.secondary}><Text style={styles.secondaryText}>＋ Add question</Text></Pressable>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}><Pressable onPress={() => setOpen(false)} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable><Pressable disabled={save.isPending} onPress={() => { setError(""); save.mutate(); }} style={styles.primary}><Text style={styles.primaryText}>{save.isPending ? "Saving…" : "Save form"}</Text></Pressable></View>
        </ScrollView></View></View>
      </Modal>
    </ScrollView>
  );
}

function answerLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return Array.isArray(value) ? value.join(", ") : "—";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <View style={styles.state}>{!detail ? <ActivityIndicator color={colors.green} /> : null}<Text style={styles.cardTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}{retry ? <Pressable onPress={retry}><Text style={styles.retry}>Try again</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCopy: { flex: 1, gap: 4 },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  primary: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" },
  primaryText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  secondary: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center" },
  secondaryText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  scopes: { flexDirection: "row", gap: 7, paddingVertical: 2 },
  scope: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  scopeActive: { borderColor: colors.green, backgroundColor: colors.greenWash },
  scopeText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  scopeTextActive: { color: colors.greenDark },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11, gap: 8 },
  cardTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  body: { color: colors.text, fontSize: 10, lineHeight: 15 },
  meta: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 3 },
  delete: { backgroundColor: colors.redWash, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  deleteText: { color: colors.red, fontSize: 8, fontWeight: "800" },
  empty: { alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 20 },
  response: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, gap: 4 },
  responseName: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,31,24,.42)" },
  sheet: { maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 },
  grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  sheetContent: { gap: 9, paddingBottom: 12 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },
  multilineShort: { minHeight: 60, textAlignVertical: "top" },
  questionCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 9, gap: 8 },
  questionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requiredRow: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 30 },
  checkmark: { color: colors.greenDark, fontSize: 14, fontWeight: "800" },
  error: { color: colors.red, fontSize: 10, lineHeight: 15 },
  retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, padding: 24 },
});
