import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Sharing from "expo-sharing";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import Pdf from "react-native-pdf";

import { useAuthStore } from "@/auth/auth-store";
import {
  cancelSignatureRequest,
  createSignatureRequest,
  declineSignatureRequest,
  getSignatureMembers,
  getSignatureRequest,
  getSignatureRequests,
  getSignatureSources,
  signSignatureRequest,
  type SignatureMode,
  type SignatureRequest,
  type SignatureSource,
} from "@/signatures/api";
import { downloadAuthenticatedFile } from "@/files/download";
import { colors } from "@/ui/theme";
import { getWorkspaceChoices } from "@/workspaces/api";

const consentCopy = "I knowingly adopt this electronic mark as my signature for this document and consent to electronic records and signatures.";
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
type RequestDraft = { sourceFileId: string; signerMemberIds: string[]; mode: SignatureMode; dueAt: string };

export default function SignaturesScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<RequestDraft>({ sourceFileId: "", signerMemberIds: [], mode: "SEQUENTIAL", dueAt: "" });
  const [typedName, setTypedName] = useState(user?.name ?? "");
  const [signatureMethod, setSignatureMethod] = useState<"TYPED" | "DRAWN">("TYPED");
  const [signaturePng, setSignaturePng] = useState("");
  const [signatureStrokes, setSignatureStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPath, setPreviewPath] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [previewUri, setPreviewUri] = useState("");
  const signatureShotRef = useRef<any>(null);
  const [consent, setConsent] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspaces = workspacesQuery.data ?? [];
  const workspace = workspaces.find((item) => item.id === workspaceId) ?? workspaces[0] ?? null;
  const activeWorkspaceId = workspace?.id;

  useEffect(() => {
    if (workspaces.length && !workspaces.some((item) => item.id === workspaceId)) {
      setWorkspaceId(workspaces[0]?.id ?? null);
      setSelectedId("");
    }
  }, [workspaceId, workspaces]);

  const requestsQuery = useQuery({
    queryKey: ["workspace-signatures", activeWorkspaceId],
    queryFn: () => getSignatureRequests(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const requestQuery = useQuery({
    queryKey: ["workspace-signature", activeWorkspaceId, selectedId],
    queryFn: () => getSignatureRequest(activeWorkspaceId!, selectedId),
    enabled: Boolean(activeWorkspaceId && selectedId),
  });
  const sourcesQuery = useQuery({
    queryKey: ["signature-sources", activeWorkspaceId],
    queryFn: () => getSignatureSources(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId && createOpen),
  });
  const membersQuery = useQuery({
    queryKey: ["signature-members", activeWorkspaceId],
    queryFn: () => getSignatureMembers(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId && createOpen),
  });

  const request = requestQuery.data ?? (requestsQuery.data ?? []).find((item) => item.id === selectedId) ?? null;
  const nextSigner = request?.signers.find((signer) => signer.status === "PENDING");
  const currentSigner = request?.signers.find((signer) => signer.userId === user?.id);
  const canSign = Boolean(request && request.status === "PENDING" && currentSigner?.status === "PENDING"
    && (request.mode === "PARALLEL" || nextSigner?.id === currentSigner.id));
  const canCancel = Boolean(request && request.status === "PENDING"
    && (request.createdById === user?.id || workspace?.role === "OWNER" || workspace?.role === "ADMIN"));
  const source = useMemo(() => (sourcesQuery.data ?? []).find((item) => item.id === draft.sourceFileId), [draft.sourceFileId, sourcesQuery.data]);
  const requestsKey = ["workspace-signatures", activeWorkspaceId];

  const refresh = async (requestId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: requestsKey }),
      queryClient.invalidateQueries({ queryKey: ["workspace-signature", activeWorkspaceId, requestId ?? selectedId] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-notifications", activeWorkspaceId] }),
    ]);
  };

  const createRequest = useMutation({
    mutationFn: () => {
      if (!activeWorkspaceId) throw new Error("Choose a workspace first.");
      if (!draft.sourceFileId) throw new Error("Choose an accessible PDF.");
      if (draft.signerMemberIds.length === 0) throw new Error("Choose at least one active signer.");
      const dueAt = draft.dueAt ? new Date(draft.dueAt) : null;
      if (draft.dueAt && (!dueAt || Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now())) {
        throw new Error("The due date must be a valid future date and time.");
      }
      return createSignatureRequest(activeWorkspaceId, {
        sourceFileId: draft.sourceFileId,
        mode: draft.mode,
        signerMemberIds: draft.signerMemberIds,
        ...(dueAt ? { dueAt: dueAt.toISOString() } : {}),
      });
    },
    onSuccess: async (created) => {
      setCreateOpen(false);
      setError("");
      setDraft({ sourceFileId: "", signerMemberIds: [], mode: "SEQUENTIAL", dueAt: "" });
      setSelectedId(created.id);
      await refresh(created.id);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to create the signature request."),
  });

  const signRequest = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId || !selectedId) throw new Error("Choose a signature request first.");
      if (!user?.emailVerified) throw new Error("Verify your account email before signing.");
      if (!consent) throw new Error("Confirm your consent before signing.");
      if (signatureMethod === "TYPED") {
        if (!typedName.trim()) throw new Error("Enter your name as it appears on your account.");
      } else if (!signaturePng) {
        throw new Error("Draw your signature before continuing.");
      }
      return signSignatureRequest(activeWorkspaceId, selectedId, {
        consent,
        method: signatureMethod,
        ...(signatureMethod === "TYPED"
          ? { signedName: typedName.trim() }
          : { signaturePng }),
      });
    },
    onSuccess: async (updated) => {
      setConsent(false);
      setError("");
      await refresh(updated.id);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to apply your signature."),
  });

  const declineRequest = useMutation({
    mutationFn: () => {
      if (!activeWorkspaceId || !selectedId) throw new Error("Choose a signature request first.");
      return declineSignatureRequest(activeWorkspaceId, selectedId, declineReason.trim() || undefined);
    },
    onSuccess: async (updated) => {
      setDeclineReason("");
      setError("");
      await refresh(updated.id);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to decline this request."),
  });

  const cancelRequest = useMutation({
    mutationFn: () => {
      if (!activeWorkspaceId || !selectedId) throw new Error("Choose a signature request first.");
      return cancelSignatureRequest(activeWorkspaceId, selectedId);
    },
    onSuccess: async (updated) => {
      setError("");
      await refresh(updated.id);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to cancel this request."),
  });

  async function getDocument(path: string, file: Pick<SignatureSource, "id" | "name">) {
    setDownloadError("");
    const localFile = await downloadAuthenticatedFile(path, { ...file, mimeType: "application/pdf" });
    return localFile;
  }

  async function previewDocument(path: string, file: Pick<SignatureSource, "id" | "name">) {
    try {
      const localFile = await getDocument(path, file);
      setPreviewUri(localFile.uri);
      setPreviewPath(path);
      setPreviewName(file.name);
      setPreviewOpen(true);
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : "Unable to open this PDF.");
    }
  }

  async function shareDocument(path: string, file: Pick<SignatureSource, "id" | "name">) {
    try {
      const localFile = await getDocument(path, file);
      if (!(await Sharing.isAvailableAsync())) throw new Error("Document sharing is not available on this device.");
      await Sharing.shareAsync(localFile.uri, { mimeType: "application/pdf", dialogTitle: file.name });
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : "Unable to open this PDF.");
    }
  }

  function confirmCancel() {
    if (!request) return;
    Alert.alert("Cancel signature request?", "Pending signers will no longer be able to sign this document.", [
      { text: "Keep request", style: "cancel" },
      { text: "Cancel request", style: "destructive", onPress: () => cancelRequest.mutate() },
    ]);
  }

  function toggleSigner(memberId: string) {
    setDraft((current) => ({
      ...current,
      signerMemberIds: current.signerMemberIds.includes(memberId)
        ? current.signerMemberIds.filter((id) => id !== memberId)
        : [...current.signerMemberIds, memberId],
    }));
  }

  if (workspacesQuery.isPending) return <State title="Loading workspaces…" />;
  if (workspacesQuery.isError) return <State title="Workspaces couldn’t load" detail={message(workspacesQuery.error)} retry={() => void workspacesQuery.refetch()} />;
  if (!workspace) return <State title="No business workspace" detail="Signatures are available in a workspace you own or have been invited to." />;
  if (requestsQuery.isPending) return <State title="Loading signature requests…" />;
  if (requestsQuery.isError) return <State title="Signature requests couldn’t load" detail={message(requestsQuery.error)} retry={() => void requestsQuery.refetch()} />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>DOCUMENT WORKFLOWS</Text>
          <Text style={styles.title}>Signatures</Text>
          <Text style={styles.subtitle}>Send, review and track signatures with a clear audit trail.</Text>
        </View>
        <Pressable onPress={() => { setError(""); setCreateOpen(true); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋ Request</Text></Pressable>
      </View>

      {workspaces.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {workspaces.map((item) => (
            <Pressable key={item.id} accessibilityState={{ selected: workspace.id === item.id }} onPress={() => { setWorkspaceId(item.id); setSelectedId(""); }} style={[styles.chip, workspace.id === item.id ? styles.chipActive : null]}>
              <Text style={[styles.chipText, workspace.id === item.id ? styles.chipTextActive : null]}>{item.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : <Text style={styles.workspaceLabel}>{workspace.name} · {workspace.role.toLowerCase()}</Text>}

      <View style={styles.sectionHeading}><View><Text style={styles.kicker}>INBOX & HISTORY</Text><Text style={styles.sectionTitle}>{(requestsQuery.data ?? []).length} requests</Text></View></View>
      {(requestsQuery.data ?? []).length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Your signature desk is clear</Text>
          <Text style={styles.subtitle}>New signature requests and records will appear here.</Text>
          <Pressable onPress={() => setCreateOpen(true)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Create request</Text></Pressable>
        </View>
      ) : (requestsQuery.data ?? []).map((item) => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === selectedId }} onPress={() => { setSelectedId(item.id); setError(""); setDownloadError(""); }} style={[styles.requestCard, selectedId === item.id ? styles.requestSelected : null]}>
          <View style={styles.requestCopy}>
            <Text numberOfLines={1} style={styles.requestTitle}>{item.sourceName}</Text>
            <Text style={styles.meta}>{item.mode.toLowerCase()} · {item.signers.filter((signer) => signer.status === "SIGNED").length}/{item.signers.length} signed</Text>
            {item.dueAt ? <Text style={styles.meta}>Due {dateFormat.format(new Date(item.dueAt))}</Text> : null}
          </View>
          <StatusBadge status={item.status} />
        </Pressable>
      ))}

      {selectedId && requestQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
      {selectedId && requestQuery.isError ? <View style={styles.inlineError}><Text style={styles.error}>{message(requestQuery.error)}</Text><Pressable onPress={() => void requestQuery.refetch()}><Text style={styles.link}>Retry</Text></Pressable></View> : null}
      {request ? (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailCopy}><Text style={styles.kicker}>SIGNATURE RECORD</Text><Text style={styles.sectionTitle}>{request.sourceName}</Text><Text style={styles.meta}>{request.mode.toLowerCase()} signing · created {dateFormat.format(new Date(request.createdAt))}</Text></View>
            <StatusBadge status={request.status} />
          </View>
          <View style={styles.actionRow}>
            <Pressable onPress={() => void previewDocument(`/workspaces/${encodeURIComponent(workspace.id)}/signatures/${encodeURIComponent(request.id)}/document`, { id: request.id, name: request.sourceName })} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Preview PDF</Text></Pressable>
            <Pressable onPress={() => void shareDocument(`/workspaces/${encodeURIComponent(workspace.id)}/signatures/${encodeURIComponent(request.id)}/document`, { id: request.id, name: request.sourceName })} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Share PDF</Text></Pressable>
            {request.finalFile ? <Pressable onPress={() => void shareDocument(`/workspaces/${encodeURIComponent(workspace.id)}/signatures/${encodeURIComponent(request.id)}/final`, { id: `${request.id}-final`, name: request.finalFile!.originalName })} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Signed copy</Text></Pressable> : null}
            {canCancel ? <Pressable disabled={cancelRequest.isPending} onPress={confirmCancel} style={styles.cancelButton}><Text style={styles.cancelText}>{cancelRequest.isPending ? "Cancelling…" : "Cancel request"}</Text></Pressable> : null}
          </View>
          {downloadError ? <Text accessibilityRole="alert" style={styles.error}>{downloadError}</Text> : null}
          <Text style={styles.kicker}>SIGNERS</Text>
          {request.signers.map((signer, index) => (
            <View key={signer.id} style={styles.signerRow}>
              <View style={styles.stepBadge}><Text style={styles.stepText}>{index + 1}</Text></View>
              <View style={styles.signerCopy}>
                <Text style={styles.signerName}>{signer.name}</Text>
                <Text style={styles.meta}>{signer.email}</Text>
                {signer.signedAt ? <Text style={styles.meta}>{signer.method?.toLowerCase()} signature · {dateFormat.format(new Date(signer.signedAt))}</Text> : null}
                {signer.declineReason ? <Text style={styles.error}>Declined: {signer.declineReason}</Text> : null}
                {request.mode === "SEQUENTIAL" && signer.status === "PENDING" && nextSigner?.id !== signer.id ? <Text style={styles.meta}>Waiting for the previous signer.</Text> : null}
              </View>
              <StatusBadge status={signer.status} />
            </View>
          ))}

          {canSign ? (
            <View style={styles.signPanel}>
              <Text style={styles.signTitle}>Apply your signature</Text>
              {!user?.emailVerified ? <Text accessibilityRole="alert" style={styles.error}>Verify your account email before signing.</Text> : null}
              <Text style={styles.label}>Signature style</Text>
              <View style={styles.choiceRow}>
                <Pressable onPress={() => setSignatureMethod("TYPED")} style={[styles.choice, signatureMethod === "TYPED" ? styles.choiceSelected : null]}><Text style={[styles.choiceText, signatureMethod === "TYPED" ? styles.choiceTextSelected : null]}>Typed</Text></Pressable>
                <Pressable onPress={() => setSignatureMethod("DRAWN")} style={[styles.choice, signatureMethod === "DRAWN" ? styles.choiceSelected : null]}><Text style={[styles.choiceText, signatureMethod === "DRAWN" ? styles.choiceTextSelected : null]}>Drawn</Text></Pressable>
              </View>
              {signatureMethod === "TYPED" ? (
                <>
                  <Text style={styles.label}>Type your account name</Text>
                  <TextInput autoCapitalize="words" maxLength={120} onChangeText={setTypedName} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input} value={typedName} />
                </>
              ) : (
                <SignaturePad
                  ref={signatureShotRef}
                  strokes={signatureStrokes}
                  setStrokes={setSignatureStrokes}
                  onCaptured={setSignaturePng}
                />
              )}
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent((value) => !value)} style={styles.consentRow}>
                <View style={[styles.checkbox, consent ? styles.checkboxActive : null]}><Text style={styles.checkmark}>{consent ? "✓" : ""}</Text></View>
                <Text style={styles.consentText}>{consentCopy}</Text>
              </Pressable>
              <Pressable disabled={!user?.emailVerified || !consent || (signatureMethod === "TYPED" ? !typedName.trim() : !signaturePng) || signRequest.isPending} onPress={() => { setError(""); signRequest.mutate(); }} style={[styles.primaryButton, (!user?.emailVerified || !consent || (signatureMethod === "TYPED" ? !typedName.trim() : !signaturePng)) ? styles.disabled : null]}>
                <Text style={styles.primaryButtonText}>{signRequest.isPending ? "Signing…" : "Consent and sign"}</Text>
              </Pressable>
              {currentSigner?.status === "PENDING" ? (
                <View style={styles.declinePanel}>
                  <Text style={styles.label}>Optional reason to decline</Text>
                  <TextInput maxLength={1000} onChangeText={setDeclineReason} placeholder="Add a reason" placeholderTextColor={colors.muted} style={styles.input} value={declineReason} />
                  <Pressable disabled={declineRequest.isPending} onPress={() => { setError(""); declineRequest.mutate(); }} style={styles.cancelButton}><Text style={styles.cancelText}>{declineRequest.isPending ? "Declining…" : "Decline request"}</Text></Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
          {request.status === "COMPLETED" ? <Text style={styles.successText}>All signatures are complete. A signed PDF copy is available.</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Text style={styles.legalNote}>Electronic signatures are recorded with consent and an audit trail. This workflow does not claim qualified electronic-signature or legal status.</Text>
        </View>
      ) : null}

      <Modal animationType="slide" onRequestClose={() => setPreviewOpen(false)} transparent visible={previewOpen}>
        <View style={styles.previewBackdrop}>
          <View style={styles.previewSheet}>
            <View style={styles.previewHeader}>
              <View style={styles.previewTitleWrap}><Text style={styles.kicker}>DOCUMENT PREVIEW</Text><Text numberOfLines={1} style={styles.previewTitle}>{previewName}</Text></View>
              <Pressable onPress={() => setPreviewOpen(false)} style={styles.previewClose}><Text style={styles.previewCloseText}>Close</Text></Pressable>
            </View>
            {previewUri ? (
              <Pdf
                source={{ uri: previewUri, cache: true }}
                trustAllCerts={false}
                enablePaging
                enableAntialiasing
                style={styles.pdfViewer}
                onError={(error) => setDownloadError(error?.message ? String(error.message) : "This PDF could not be rendered.")}
              />
            ) : <State title="Preparing document…" />}
            <View style={styles.previewActions}>
              <Pressable onPress={() => void shareDocument(previewPath, { id: request?.id ?? "signature", name: previewName })} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Share</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => setCreateOpen(false)} transparent visible={createOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.kicker}>{workspace.name}</Text><Text style={styles.sheetTitle}>New signature request</Text>
              <Text style={styles.subtitle}>Choose a workspace PDF and the people who need to sign.</Text>
              <Text style={styles.label}>Workspace PDF</Text>
              {sourcesQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
              {sourcesQuery.isError ? <RetryMessage text={message(sourcesQuery.error)} onPress={() => void sourcesQuery.refetch()} /> : null}
              {(sourcesQuery.data ?? []).map((file) => <SourceChoice key={file.id} file={file} selected={draft.sourceFileId === file.id} onPress={() => setDraft((current) => ({ ...current, sourceFileId: file.id }))} />)}
              {!sourcesQuery.isPending && !sourcesQuery.isError && !sourcesQuery.data?.length ? <Text style={styles.meta}>No accessible PDFs yet. Add a PDF to workspace storage to begin.</Text> : null}
              <Text style={styles.label}>Active signers · verified email required</Text>
              {membersQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
              {membersQuery.isError ? <RetryMessage text={message(membersQuery.error)} onPress={() => void membersQuery.refetch()} /> : null}
              {(membersQuery.data ?? []).map((member) => (
                <Pressable key={member.id} accessibilityRole="checkbox" accessibilityState={{ checked: draft.signerMemberIds.includes(member.id), disabled: !member.emailVerified }} disabled={!member.emailVerified} onPress={() => toggleSigner(member.id)} style={[styles.memberRow, !member.emailVerified ? styles.memberDisabled : null]}>
                  <View style={[styles.checkbox, draft.signerMemberIds.includes(member.id) ? styles.checkboxActive : null]}><Text style={styles.checkmark}>{draft.signerMemberIds.includes(member.id) ? "✓" : ""}</Text></View>
                  <View style={styles.memberCopy}><Text style={styles.signerName}>{member.name}</Text><Text style={styles.meta}>{member.email}{member.emailVerified ? "" : " · verify email before signing"}</Text></View>
                </Pressable>
              ))}
              <Text style={styles.label}>Signing order</Text>
              <View style={styles.choiceRow}>
                {(["SEQUENTIAL", "PARALLEL"] as const).map((mode) => (
                  <Pressable key={mode} onPress={() => setDraft((current) => ({ ...current, mode }))} style={[styles.choice, draft.mode === mode ? styles.choiceSelected : null]}>
                    <Text style={[styles.choiceText, draft.mode === mode ? styles.choiceTextSelected : null]}>{mode === "SEQUENTIAL" ? "Sequential" : "Parallel"}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.helper}>{draft.mode === "SEQUENTIAL" ? "Signers follow the order you select." : "Signers may sign in any order."}</Text>
              <Text style={styles.label}>Due date · optional</Text>
              <TextInput autoCapitalize="none" onChangeText={(dueAt) => setDraft((current) => ({ ...current, dueAt }))} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={colors.muted} style={styles.input} value={draft.dueAt} />
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <View style={styles.formFooter}>
                <Pressable disabled={createRequest.isPending} onPress={() => setCreateOpen(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Close</Text></Pressable>
                <Pressable disabled={createRequest.isPending || !source || draft.signerMemberIds.length === 0} onPress={() => { setError(""); createRequest.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{createRequest.isPending ? "Creating…" : "Create request"}</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

type SignaturePadProps = {
  ref: React.RefObject<any>;
  strokes: { x: number; y: number }[][];
  setStrokes: React.Dispatch<React.SetStateAction<{ x: number; y: number }[][]>>;
  onCaptured: (value: string) => void;
};

function SignaturePad({ ref, strokes, setStrokes, onCaptured }: SignaturePadProps) {
  const [activeStroke, setActiveStroke] = useState<{ x: number; y: number }[]>([]);

  async function capture() {
    try {
      const uri = await ref.current?.capture?.();
      if (!uri) {
        onCaptured("");
        return;
      }
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error("Unable to encode the drawn signature."));
        reader.onload = () => {
          const result = reader.result;
          resolve(typeof result === "string" ? result : "");
        };
        reader.readAsDataURL(blob);
      });
      if (!base64.startsWith("data:image/png;base64,")) {
        throw new Error("The drawn signature could not be converted to PNG.");
      }
      onCaptured(base64);
    } catch (error) {
      onCaptured("");
    }
  }

  function clear() {
    setStrokes([]);
    setActiveStroke([]);
    onCaptured("");
  }

  return (
    <View style={styles.signaturePadWrap}>
      <ViewShot ref={ref} options={{ format: "png", quality: 1, result: "tmpfile" }} style={styles.signaturePad}>
        <View
          style={styles.signatureCanvas}
          onTouchStart={(event) => {
            const touch = event.nativeEvent.touches[0];
            setActiveStroke([{ x: touch.locationX, y: touch.locationY }]);
          }}
          onTouchMove={(event) => {
            const touch = event.nativeEvent.touches[0];
            setActiveStroke((current) => [...current, { x: touch.locationX, y: touch.locationY }]);
          }}
          onTouchEnd={() => {
            if (activeStroke.length) {
              setStrokes((current) => [...current, activeStroke]);
              setActiveStroke([]);
              void capture();
            }
          }}
        >
          <Svg width="100%" height="100%">
            {[...strokes, ...(activeStroke.length ? [activeStroke] : [])].map((stroke, index) => (
              <Polyline
                key={index}
                points={stroke.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#183e33"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
        </View>
      </ViewShot>
      <Pressable onPress={clear} style={styles.clearSignatureButton}><Text style={styles.secondaryButtonText}>Clear drawing</Text></Pressable>
    </View>
  );
}

function SourceChoice({ file, selected, onPress }: { file: SignatureSource; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.sourceChoice, selected ? styles.sourceSelected : null]}><View style={[styles.radio, selected ? styles.radioSelected : null]} /><View style={styles.memberCopy}><Text numberOfLines={1} style={styles.signerName}>{file.name}</Text><Text style={styles.meta}>{formatBytes(file.sizeBytes)}</Text></View></Pressable>;
}

function StatusBadge({ status }: { status: string }) {
  const success = status === "COMPLETED" || status === "SIGNED" || status === "APPROVED";
  const danger = status === "DECLINED" || status === "CANCELLED" || status === "REJECTED";
  return <View style={[styles.statusBadge, success ? styles.statusSuccess : danger ? styles.statusDanger : null]}><Text style={[styles.statusText, success ? styles.statusSuccessText : danger ? styles.statusDangerText : null]}>{status.replaceAll("_", " ").toLowerCase()}</Text></View>;
}

function RetryMessage({ text, onPress }: { text: string; onPress: () => void }) {
  return <View style={styles.inlineError}><Text style={styles.error}>{text}</Text><Pressable onPress={onPress}><Text style={styles.link}>Retry</Text></Pressable></View>;
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <View style={styles.state}><Text style={styles.sectionTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : <ActivityIndicator color={colors.green} />}{retry ? <Pressable onPress={retry}><Text style={styles.link}>Try again</Text></Pressable> : null}</View>;
}

function formatBytes(value: string): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "PDF";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCopy: { flex: 1, gap: 4 },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  workspaceLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  chipRow: { gap: 7 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.greenWash, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  chipTextActive: { color: colors.greenDark },
  primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  cancelButton: { borderWidth: 1, borderColor: colors.redWash, backgroundColor: colors.redWash, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center", justifyContent: "center" },
  cancelText: { color: colors.red, fontSize: 10, fontWeight: "800" },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", marginTop: 3 },
  requestCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 11 },
  requestSelected: { borderColor: colors.green, backgroundColor: colors.greenWash },
  requestCopy: { flex: 1, gap: 4 },
  requestTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  statusBadge: { alignSelf: "flex-start", backgroundColor: colors.sand, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { color: colors.ink, fontSize: 8, fontWeight: "800" },
  statusSuccess: { backgroundColor: colors.greenWash },
  statusSuccessText: { color: colors.greenDark },
  statusDanger: { backgroundColor: colors.redWash },
  statusDangerText: { color: colors.red },
  empty: { alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 20 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  detailCard: { gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 13, marginTop: 4 },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detailCopy: { flex: 1, gap: 3 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  signerRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.line },
  stepBadge: { width: 23, height: 23, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenWash },
  stepText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  signerCopy: { flex: 1, gap: 2 },
  signerName: { color: colors.text, fontSize: 10, fontWeight: "700" },
  signPanel: { gap: 8, borderRadius: 12, backgroundColor: colors.greenWash, padding: 11, marginTop: 3 },
  signTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 2 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 11, paddingVertical: 10, color: colors.ink, fontSize: 12 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 2 },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  checkboxActive: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  consentText: { flex: 1, color: colors.text, fontSize: 9, lineHeight: 14 },
  declinePanel: { gap: 7, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, marginTop: 2 },
  successText: { color: colors.greenDark, fontSize: 10, fontWeight: "700" },
  legalNote: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  error: { color: colors.red, fontSize: 10, lineHeight: 15 },
  link: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  inlineError: { gap: 6, backgroundColor: colors.redWash, borderRadius: 10, padding: 9 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12, 31, 24, 0.42)" },
  sheet: { maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 },
  grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  sheetContent: { gap: 9, paddingBottom: 10 },
  sheetTitle: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  helper: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  signaturePadWrap: { gap: 7, marginTop: 4 },
  signaturePad: { height: 150, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, overflow: "hidden" },
  signatureCanvas: { flex: 1, backgroundColor: colors.surface },
  clearSignatureButton: { alignSelf: "flex-start", borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  previewBackdrop: { flex: 1, backgroundColor: "rgba(12, 31, 24, 0.46)" },
  previewSheet: { flex: 1, backgroundColor: colors.background, paddingTop: 10 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  previewTitleWrap: { flex: 1, gap: 3 },
  previewTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  previewClose: { borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 8 },
  previewCloseText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  pdfViewer: { flex: 1, width: "100%", backgroundColor: colors.background },
  previewActions: { paddingHorizontal: 16, paddingVertical: 10, alignItems: "flex-end", backgroundColor: colors.surface },
  sourceChoice: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 10, padding: 9 },
  sourceSelected: { borderColor: colors.green, backgroundColor: colors.greenWash },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  radioSelected: { borderWidth: 5, borderColor: colors.green },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  memberDisabled: { opacity: 0.5 },
  memberCopy: { flex: 1, gap: 2 },
  choiceRow: { flexDirection: "row", gap: 7 },
  choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  choiceSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  choiceText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  choiceTextSelected: { color: colors.greenDark },
  formFooter: { flexDirection: "row", gap: 8, marginTop: 3 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
});
