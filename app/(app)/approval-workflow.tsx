import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuthStore } from "@/auth/auth-store";
import { getWorkspaceFileListing, getWorkspaceFolders, type WorkspaceFile } from "@/files/api";
import { downloadAuthenticatedFile } from "@/files/download";
import * as Sharing from "expo-sharing";
import {
  cancelApprovalRequest,
  commentOnApprovalRequest,
  createApprovalRequest,
  createApprovalTemplate,
  decideApprovalRequest,
  getApprovalRequest,
  getApprovalRequests,
  getApprovalTemplates,
  resubmitApprovalRequest,
  setApprovalTemplateActive,
  type ApprovalDecision,
  type ApprovalRequest,
  type ApprovalReviewMode,
  type ApprovalTemplate,
  type ApprovalTemplateStepInput,
  type ApprovalView,
} from "@/approvals/api";
import { colors } from "@/ui/theme";
import { getWorkspaceChoices, getWorkspaceMembers, type WorkspaceMember } from "@/workspaces/api";

const viewOptions: { value: ApprovalView; label: string }[] = [
  { value: "mine", label: "My requests" },
  { value: "pending", label: "Needs my review" },
  { value: "history", label: "Completed" },
];
const statusNames: Record<ApprovalRequest["status"], string> = {
  IN_PROGRESS: "In progress",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
};
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
type TemplateDraftStep = ApprovalTemplateStepInput;
type RequestDraft = { templateId: string; title: string; description: string; dueAt: string; fileIds: string[] };

export default function ApprovalWorkflowScreen() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [view, setView] = useState<ApprovalView>("mine");
  const [selectedId, setSelectedId] = useState("");
  const [panel, setPanel] = useState<"request" | "template" | null>(null);
  const [requestDraft, setRequestDraft] = useState<RequestDraft>({ templateId: "", title: "", description: "", dueAt: "", fileIds: [] });
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateSteps, setTemplateSteps] = useState<TemplateDraftStep[]>([{ mode: "SEQUENTIAL", approverMemberIds: [] }]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspaces = workspacesQuery.data ?? [];
  const workspace = workspaces.find((item) => item.id === workspaceId) ?? workspaces[0] ?? null;
  const activeWorkspaceId = workspace?.id;
  const isAdministrator = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  useEffect(() => {
    if (workspaces.length && !workspaces.some((item) => item.id === workspaceId)) {
      setWorkspaceId(workspaces[0]?.id ?? null);
      setSelectedId("");
    }
  }, [workspaceId, workspaces]);

  const membersQuery = useQuery({
    queryKey: ["workspace-members", activeWorkspaceId],
    queryFn: () => getWorkspaceMembers(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const templatesQuery = useQuery({
    queryKey: ["approval-templates", activeWorkspaceId],
    queryFn: () => getApprovalTemplates(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });
  const requestsQuery = useQuery({
    queryKey: ["approval-requests", activeWorkspaceId, view],
    queryFn: () => getApprovalRequests(activeWorkspaceId!, view),
    enabled: Boolean(activeWorkspaceId),
  });
  const requestQuery = useQuery({
    queryKey: ["approval-request", activeWorkspaceId, selectedId],
    queryFn: () => getApprovalRequest(activeWorkspaceId!, selectedId),
    enabled: Boolean(activeWorkspaceId && selectedId),
  });
  const foldersQuery = useQuery({
    queryKey: ["approval-workspace-folders", activeWorkspaceId],
    queryFn: () => getWorkspaceFolders(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId && panel === "request"),
  });
  const rootFilesQuery = useQuery({
    queryKey: ["approval-workspace-files", activeWorkspaceId, null],
    queryFn: () => getWorkspaceFileListing(activeWorkspaceId!, null),
    enabled: Boolean(activeWorkspaceId && panel === "request"),
  });
  const accessibleFolders = (foldersQuery.data ?? []).filter((folder) =>
    folder.permissions?.includes("viewFiles") && folder.permissions.includes("downloadFiles"));
  const folderFileQueries = useQueries({
    queries: accessibleFolders.map((folder) => ({
      queryKey: ["approval-workspace-files", activeWorkspaceId, folder.id],
      queryFn: () => getWorkspaceFileListing(activeWorkspaceId!, folder.id),
      enabled: Boolean(activeWorkspaceId && panel === "request"),
    })),
  });

  const activeMembers = (membersQuery.data ?? []).filter((member) => member.status === "ACTIVE");
  const activeTemplates = (templatesQuery.data ?? []).filter((template) => template.isActive);
  const requests = requestsQuery.data ?? [];
  const selectedRequest = requestQuery.data ?? requests.find((item) => item.id === selectedId) ?? null;
  const activeStep = selectedRequest?.steps.find((step) => step.stepOrder === selectedRequest.currentStepOrder);
  const assignedToMe = activeStep?.approvers.some((approver) =>
    approver.decision === "PENDING" && approver.member.user.id === currentUserId) ?? false;
  const isRequester = selectedRequest?.requesterId === currentUserId;
  const canCancel = Boolean(selectedRequest
    && (isRequester || isAdministrator)
    && (selectedRequest.status === "IN_PROGRESS" || selectedRequest.status === "CHANGES_REQUESTED"));
  const canResubmit = Boolean(selectedRequest && isRequester && selectedRequest.status === "CHANGES_REQUESTED");

  const availableFiles = useMemo(() => {
    const files: WorkspaceFile[] = [
      ...(rootFilesQuery.data?.files ?? []),
      ...folderFileQueries.flatMap((query) => query.data?.files ?? []),
    ];
    return [...new Map(files.map((file) => [file.id, file])).values()];
  }, [folderFileQueries, rootFilesQuery.data]);

  const currentRequestsKey = ["approval-requests", activeWorkspaceId];
  const refresh = async (requestId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: currentRequestsKey }),
      queryClient.invalidateQueries({ queryKey: ["approval-request", activeWorkspaceId, requestId ?? selectedId] }),
      queryClient.invalidateQueries({ queryKey: ["approval-templates", activeWorkspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-notifications", activeWorkspaceId] }),
    ]);
  };

  const createRequest = useMutation({
    mutationFn: () => {
      if (!activeWorkspaceId) throw new Error("Choose a workspace first.");
      if (!requestDraft.templateId) throw new Error("Choose an approval workflow.");
      if (!requestDraft.title.trim()) throw new Error("Add a title for this request.");
      const dueAt = requestDraft.dueAt ? new Date(requestDraft.dueAt) : null;
      if (requestDraft.dueAt && (!dueAt || Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now())) {
        throw new Error("The due date must be a valid future date and time.");
      }
      return createApprovalRequest(activeWorkspaceId, {
        templateId: requestDraft.templateId,
        title: requestDraft.title.trim(),
        ...(requestDraft.description.trim() ? { description: requestDraft.description.trim() } : {}),
        ...(dueAt ? { dueAt: dueAt.toISOString() } : {}),
        ...(requestDraft.fileIds.length ? { fileIds: requestDraft.fileIds } : {}),
      });
    },
    onSuccess: async (created) => {
      setPanel(null);
      setError("");
      setRequestDraft({ templateId: "", title: "", description: "", dueAt: "", fileIds: [] });
      setSelectedId(created.id);
      await refresh(created.id);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to submit this request."),
  });

  const createTemplate = useMutation({
    mutationFn: () => {
      if (!activeWorkspaceId) throw new Error("Choose a workspace first.");
      if (!templateName.trim()) throw new Error("Add a name for this workflow.");
      if (templateSteps.some((step) => step.approverMemberIds.length === 0)) throw new Error("Choose at least one approver for every stage.");
      return createApprovalTemplate(activeWorkspaceId, {
        name: templateName.trim(),
        ...(templateDescription.trim() ? { description: templateDescription.trim() } : {}),
        steps: templateSteps,
      });
    },
    onSuccess: async () => {
      setPanel(null);
      setError("");
      setTemplateName("");
      setTemplateDescription("");
      setTemplateSteps([{ mode: "SEQUENTIAL", approverMemberIds: [] }]);
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to save this workflow."),
  });

  const toggleTemplate = useMutation({
    mutationFn: ({ templateId, isActive }: { templateId: string; isActive: boolean }) => {
      if (!activeWorkspaceId) throw new Error("Choose a workspace first.");
      return setApprovalTemplateActive(activeWorkspaceId, templateId, isActive);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approval-templates", activeWorkspaceId] }),
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to update this workflow."),
  });

  const updateRequest = useMutation({
    mutationFn: ({ action, decision }: { action: "decision" | "resubmit" | "cancel" | "comments"; decision?: Exclude<ApprovalDecision, "PENDING"> }) => {
      if (!activeWorkspaceId || !selectedId) throw new Error("Choose a request first.");
      if (action === "decision" && decision) {
        if (decision !== "APPROVED" && !comment.trim()) throw new Error("Add a comment when declining or requesting changes.");
        return decideApprovalRequest(activeWorkspaceId, selectedId, decision, comment.trim() || undefined);
      }
      if (action === "resubmit") return resubmitApprovalRequest(activeWorkspaceId, selectedId, comment.trim() || undefined);
      if (action === "comments") {
        if (!comment.trim()) throw new Error("Write a comment before posting.");
        return commentOnApprovalRequest(activeWorkspaceId, selectedId, comment.trim());
      }
      return cancelApprovalRequest(activeWorkspaceId, selectedId);
    },
    onSuccess: async () => {
      setComment("");
      setError("");
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Unable to update this request."),
  });

  async function shareAttachment(fileId: string, fileName: string) {
    setActionError("");
    if (!activeWorkspaceId) return;
    try {
      const file = await downloadAuthenticatedFile(
        `/workspaces/${encodeURIComponent(activeWorkspaceId)}/files/${encodeURIComponent(fileId)}/download`,
        { id: fileId, name: fileName, mimeType: "application/octet-stream" },
      );
      if (!(await Sharing.isAvailableAsync())) throw new Error("Document sharing is not available on this device.");
      await Sharing.shareAsync(file.uri, { dialogTitle: fileName });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to open this attachment.");
    }
  }

  function confirmCancel() {
    Alert.alert("Cancel approval request?", "Reviewers will no longer be able to act on this request.", [
      { text: "Keep request", style: "cancel" },
      { text: "Cancel request", style: "destructive", onPress: () => updateRequest.mutate({ action: "cancel" }) },
    ]);
  }

  function toggleApprover(stageIndex: number, memberId: string) {
    setTemplateSteps((current) => current.map((stage, index) => {
      if (stageIndex !== index) return stage;
      const wasSelected = stage.approverMemberIds.includes(memberId);
      return {
        ...stage,
        approverMemberIds: wasSelected
          ? stage.approverMemberIds.filter((id) => id !== memberId)
          : stage.mode === "SEQUENTIAL" ? [memberId] : [...stage.approverMemberIds, memberId],
      };
    }));
  }

  if (workspacesQuery.isPending) return <State title="Loading workspaces…" />;
  if (workspacesQuery.isError) return <State title="Workspaces couldn’t load" detail={message(workspacesQuery.error)} retry={() => void workspacesQuery.refetch()} />;
  if (!workspace) return <State title="No business workspace" detail="Approvals are available in a workspace you own or have been invited to." />;
  if (requestsQuery.isPending) return <State title="Loading approvals…" />;
  if (requestsQuery.isError) return <State title="Approvals couldn’t load" detail={message(requestsQuery.error)} retry={() => void requestsQuery.refetch()} />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.kicker}>THE DECISION DESK</Text><Text style={styles.title}>Approvals</Text><Text style={styles.subtitle}>Keep decisions, reviewers and next steps together.</Text></View>
      </View>

      {workspaces.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {workspaces.map((item) => <Pressable key={item.id} accessibilityState={{ selected: workspace.id === item.id }} onPress={() => { setWorkspaceId(item.id); setSelectedId(""); }} style={[styles.chip, workspace.id === item.id ? styles.chipActive : null]}><Text style={[styles.chipText, workspace.id === item.id ? styles.chipTextActive : null]}>{item.name}</Text></Pressable>)}
      </ScrollView> : <Text style={styles.workspaceLabel}>{workspace.name} · {workspace.role.toLowerCase()}</Text>}

      <View style={styles.statsRow}>
        <Stat label="ACTIVE TEAM" value={membersQuery.data?.filter((item) => item.status === "ACTIVE").length} />
        <Stat label="WORKFLOWS" value={activeTemplates.length} />
        <Stat label={viewOptions.find((item) => item.value === view)?.label.toUpperCase() ?? "REQUESTS"} value={requests.length} />
      </View>

      <View style={styles.actionsRow}>
        {isAdministrator ? <Pressable onPress={() => { setError(""); setPanel(panel === "template" ? null : "template"); }} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{panel === "template" ? "Close workflow" : "＋ Workflow"}</Text></Pressable> : null}
        <Pressable onPress={() => { setError(""); setPanel(panel === "request" ? null : "request"); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{panel === "request" ? "Close form" : "＋ New request"}</Text></Pressable>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <View style={styles.viewTabs}>
        {viewOptions.map((option) => <Pressable key={option.value} accessibilityState={{ selected: view === option.value }} onPress={() => { setView(option.value); setSelectedId(""); }} style={[styles.viewTab, view === option.value ? styles.viewTabActive : null]}><Text style={[styles.viewText, view === option.value ? styles.viewTextActive : null]}>{option.label}</Text></Pressable>)}
      </View>

      {panel === "template" && isAdministrator ? (
        <View style={styles.formCard}>
          <Text style={styles.kicker}>WORKFLOW DESIGNER</Text><Text style={styles.sectionTitle}>Create reusable path</Text>
          <Text style={styles.label}>Workflow name</Text>
          <TextInput maxLength={160} onChangeText={setTemplateName} placeholder="e.g. Purchase approval" placeholderTextColor={colors.muted} style={styles.input} value={templateName} />
          <Text style={styles.label}>Purpose · optional</Text>
          <TextInput maxLength={2000} onChangeText={setTemplateDescription} placeholder="What kind of request uses this route?" placeholderTextColor={colors.muted} style={styles.input} value={templateDescription} />
          {templateSteps.map((step, index) => (
            <View key={`approval-stage-${index}`} style={styles.stageCard}>
              <View style={styles.stageHeader}><Text style={styles.stageTitle}>{index === 0 ? "First review" : `Then, stage ${index + 1}`}</Text>{templateSteps.length > 1 ? <Pressable onPress={() => setTemplateSteps((all) => all.filter((_, position) => position !== index))}><Text style={styles.cancelText}>Remove</Text></Pressable> : null}</View>
              <View style={styles.choiceRow}>
                {(["SEQUENTIAL", "PARALLEL"] as const).map((mode) => (
                  <Pressable key={mode} onPress={() => setTemplateSteps((all) => all.map((item, position) => position !== index ? item : { ...item, mode, approverMemberIds: mode === "SEQUENTIAL" ? item.approverMemberIds.slice(0, 1) : item.approverMemberIds }))} style={[styles.choice, step.mode === mode ? styles.choiceSelected : null]}><Text style={[styles.choiceText, step.mode === mode ? styles.choiceTextActive : null]}>{mode === "SEQUENTIAL" ? "One approver" : "Review together"}</Text></Pressable>
                ))}
              </View>
              <Text style={styles.helper}>{step.mode === "SEQUENTIAL" ? "Choose one member for this stage. Add another stage for an ordered chain." : "All selected members review this request at the same time."}</Text>
              {activeMembers.map((member) => <MemberOption key={member.id} member={member} selected={step.approverMemberIds.includes(member.id)} onPress={() => toggleApprover(index, member.id)} />)}
              {membersQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
              {membersQuery.isError ? <RetryMessage text={message(membersQuery.error)} onPress={() => void membersQuery.refetch()} /> : null}
            </View>
          ))}
          <View style={styles.actionsRow}>
            <Pressable disabled={templateSteps.length >= 10} onPress={() => setTemplateSteps((stages) => [...stages, { mode: "SEQUENTIAL", approverMemberIds: [] }])} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>＋ Add stage</Text></Pressable>
            <Pressable disabled={createTemplate.isPending || !activeMembers.length} onPress={() => { setError(""); createTemplate.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{createTemplate.isPending ? "Saving…" : "Save workflow"}</Text></Pressable>
          </View>
        </View>
      ) : null}

      {panel === "request" ? (
        <View style={styles.formCard}>
          <Text style={styles.kicker}>NEW SUBMISSION</Text><Text style={styles.sectionTitle}>Put a decision in motion</Text>
          {templatesQuery.isPending ? <ActivityIndicator color={colors.green} /> : activeTemplates.length === 0 ? <Text style={styles.helper}>An administrator needs to create an active approval workflow before requests can be submitted.</Text> : null}
          <Text style={styles.label}>Request title</Text>
          <TextInput maxLength={200} onChangeText={(title) => setRequestDraft((current) => ({ ...current, title }))} placeholder="What needs a decision?" placeholderTextColor={colors.muted} style={styles.input} value={requestDraft.title} />
          <Text style={styles.label}>Approval workflow</Text>
          {activeTemplates.map((template) => <Pressable key={template.id} accessibilityRole="radio" accessibilityState={{ selected: requestDraft.templateId === template.id }} onPress={() => setRequestDraft((current) => ({ ...current, templateId: template.id }))} style={[styles.sourceChoice, requestDraft.templateId === template.id ? styles.sourceSelected : null]}><View style={[styles.radio, requestDraft.templateId === template.id ? styles.radioSelected : null]} /><View style={styles.memberCopy}><Text style={styles.memberName}>{template.name}</Text>{template.description ? <Text style={styles.helper}>{template.description}</Text> : null}</View></Pressable>)}
          <Text style={styles.label}>Context and supporting details · optional</Text>
          <TextInput multiline maxLength={5000} onChangeText={(description) => setRequestDraft((current) => ({ ...current, description }))} placeholder="Add context for the reviewers" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} value={requestDraft.description} />
          <Text style={styles.label}>Due date · optional · YYYY-MM-DDTHH:mm</Text>
          <TextInput autoCapitalize="none" onChangeText={(dueAt) => setRequestDraft((current) => ({ ...current, dueAt }))} placeholder="2026-12-01T10:00" placeholderTextColor={colors.muted} style={styles.input} value={requestDraft.dueAt} />
          <Text style={styles.label}>Attachments · optional</Text>
          {rootFilesQuery.isPending || foldersQuery.isPending || folderFileQueries.some((query) => query.isPending) ? <ActivityIndicator color={colors.green} /> : null}
          {foldersQuery.isError ? <RetryMessage text={message(foldersQuery.error)} onPress={() => void foldersQuery.refetch()} /> : null}
          {rootFilesQuery.isError ? <RetryMessage text={message(rootFilesQuery.error)} onPress={() => void rootFilesQuery.refetch()} /> : null}
          {folderFileQueries.some((query) => query.isError) ? <RetryMessage text="Some shared-folder files couldn’t load." onPress={() => void queryClient.invalidateQueries({ queryKey: ["approval-workspace-files", activeWorkspaceId] })} /> : null}
          {availableFiles.map((file) => <Pressable key={file.id} accessibilityRole="checkbox" accessibilityState={{ checked: requestDraft.fileIds.includes(file.id) }} onPress={() => setRequestDraft((current) => ({ ...current, fileIds: current.fileIds.includes(file.id) ? current.fileIds.filter((id) => id !== file.id) : [...current.fileIds, file.id] }))} style={styles.fileOption}><View style={[styles.checkbox, requestDraft.fileIds.includes(file.id) ? styles.checkboxActive : null]}><Text style={styles.checkmark}>{requestDraft.fileIds.includes(file.id) ? "✓" : ""}</Text></View><Text numberOfLines={1} style={styles.memberName}>{file.name}</Text></Pressable>)}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable disabled={createRequest.isPending || activeTemplates.length === 0} onPress={() => { setError(""); createRequest.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{createRequest.isPending ? "Submitting…" : "Submit request"}</Text></Pressable>
        </View>
      ) : null}

      {templatesQuery.isError ? <RetryMessage text={message(templatesQuery.error)} onPress={() => void templatesQuery.refetch()} /> : null}
      {requests.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No requests in this view</Text><Text style={styles.subtitle}>{view === "pending" ? "Requests waiting for your decision will show here." : "Approval requests and their outcomes will appear here."}</Text></View> : null}
      {requests.map((item) => <Pressable key={item.id} onPress={() => { setSelectedId(item.id); setError(""); setActionError(""); }} style={[styles.requestCard, selectedId === item.id ? styles.requestSelected : null]}>
        <View style={styles.requestCopy}><Text style={styles.requestTitle}>{item.title}</Text><Text style={styles.meta}>{item.requester?.name ?? "Former member"} · {dateFormat.format(new Date(item.createdAt))}</Text><Text style={styles.meta}>{item.template?.name ?? "Workflow"}{item.dueAt ? ` · due ${dateFormat.format(new Date(item.dueAt))}` : ""}</Text></View>
        <StatusBadge status={item.status} />
      </Pressable>)}

      {selectedId && requestQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
      {selectedId && requestQuery.isError ? <RetryMessage text={message(requestQuery.error)} onPress={() => void requestQuery.refetch()} /> : null}
      {selectedRequest ? (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}><View style={styles.requestCopy}><Text style={styles.kicker}>REQUEST DETAIL</Text><Text style={styles.sectionTitle}>{selectedRequest.title}</Text><Text style={styles.meta}>Requested by {selectedRequest.requester?.name ?? "Former member"} · {dateTimeFormat.format(new Date(selectedRequest.createdAt))}</Text></View><StatusBadge status={selectedRequest.status} /></View>
          {selectedRequest.description ? <Text style={styles.description}>{selectedRequest.description}</Text> : null}
          <Text style={styles.kicker}>REVIEW ROUTE</Text>
          {selectedRequest.steps.map((step, index) => <View key={step.id} style={[styles.stageCard, step.isComplete ? styles.stageComplete : null]}>
            <Text style={styles.stageTitle}>Stage {index + 1} · {step.mode.toLowerCase()}</Text>
            {step.approvers.map((approver) => <View key={approver.id} style={styles.approverRow}><View style={styles.memberCopy}><Text style={styles.memberName}>{displayName(approver.member)}</Text><Text style={styles.helper}>{approver.decidedAt ? `${approver.decision.toLowerCase().replaceAll("_", " ")} · ${dateTimeFormat.format(new Date(approver.decidedAt))}` : "Awaiting decision"}</Text></View><StatusBadge status={approver.decision} /></View>)}
          </View>)}
          {selectedRequest.attachments.length ? <View style={styles.detailSection}><Text style={styles.kicker}>ATTACHMENTS</Text>{selectedRequest.attachments.map((attachment) => <Pressable key={attachment.id} disabled={!attachment.fileId || attachment.file?.status !== "READY" || Boolean(attachment.file?.deletedAt)} onPress={() => attachment.fileId && void shareAttachment(attachment.fileId, attachment.fileName)} style={styles.attachment}><Text numberOfLines={1} style={styles.memberName}>{attachment.fileName}</Text><Text style={styles.link}>{attachment.fileId && attachment.file?.status === "READY" && !attachment.file.deletedAt ? "Open" : "Unavailable"}</Text></Pressable>)}</View> : null}
          {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
          <View style={styles.detailSection}><Text style={styles.kicker}>DECISION HISTORY</Text>{(selectedRequest.activities ?? []).length ? selectedRequest.activities?.map((activity) => <View key={activity.id} style={styles.activityRow}><View style={styles.activityDot} /><View style={styles.memberCopy}><Text style={styles.memberName}>{activity.action.replaceAll("_", " ").toLowerCase()}</Text>{activity.comment ? <Text style={styles.description}>{activity.comment}</Text> : null}<Text style={styles.helper}>{activity.actor?.name ?? "Former member"} · {dateTimeFormat.format(new Date(activity.createdAt))}</Text></View></View>) : <Text style={styles.helper}>Activity appears here as the request progresses.</Text>}</View>

          {selectedRequest.status !== "CANCELLED" && selectedRequest.status !== "APPROVED" && selectedRequest.status !== "REJECTED" ? (
            <View style={styles.actionPanel}>
              <Text style={styles.label}>{assignedToMe ? "Your decision" : "Add a comment"}</Text>
              <TextInput multiline maxLength={2000} onChangeText={setComment} placeholder={assignedToMe ? "A comment is required to decline or request changes" : "Write a comment"} placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} value={comment} />
              {assignedToMe ? <View style={styles.actionsRow}>
                <Pressable disabled={updateRequest.isPending} onPress={() => { setError(""); updateRequest.mutate({ action: "decision", decision: "APPROVED" }); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{updateRequest.isPending ? "Sending…" : "Approve"}</Text></Pressable>
                <Pressable disabled={updateRequest.isPending || !comment.trim()} onPress={() => { setError(""); updateRequest.mutate({ action: "decision", decision: "CHANGES_REQUESTED" }); }} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Request changes</Text></Pressable>
                <Pressable disabled={updateRequest.isPending || !comment.trim()} onPress={() => { setError(""); updateRequest.mutate({ action: "decision", decision: "REJECTED" }); }} style={styles.cancelButton}><Text style={styles.cancelText}>Decline</Text></Pressable>
              </View> : null}
              {!assignedToMe ? <View style={styles.actionsRow}>
                <Pressable disabled={updateRequest.isPending || !comment.trim()} onPress={() => { setError(""); updateRequest.mutate({ action: "comments" }); }} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{updateRequest.isPending ? "Posting…" : "Post comment"}</Text></Pressable>
                {canResubmit ? <Pressable disabled={updateRequest.isPending} onPress={() => { setError(""); updateRequest.mutate({ action: "resubmit" }); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Resubmit</Text></Pressable> : null}
                {canCancel ? <Pressable disabled={updateRequest.isPending} onPress={confirmCancel} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel request</Text></Pressable> : null}
              </View> : null}
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {isAdministrator ? <View style={styles.detailCard}><Text style={styles.kicker}>REUSABLE WORKFLOWS</Text>{templatesQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}{(templatesQuery.data ?? []).map((template) => <View key={template.id} style={styles.templateRow}><View style={styles.memberCopy}><Text style={styles.memberName}>{template.name}</Text><Text style={styles.helper}>{template.steps.length} stage{template.steps.length === 1 ? "" : "s"} · {template.isActive ? "Active" : "Archived"}</Text></View><Pressable disabled={toggleTemplate.isPending} onPress={() => toggleTemplate.mutate({ templateId: template.id, isActive: !template.isActive })} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{template.isActive ? "Archive" : "Activate"}</Text></Pressable></View>)}</View> : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value ?? "—"}</Text></View>;
}

function MemberOption({ member, selected, onPress }: { member: WorkspaceMember; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={styles.memberOption}><View style={[styles.checkbox, selected ? styles.checkboxActive : null]}><Text style={styles.checkmark}>{selected ? "✓" : ""}</Text></View><View style={styles.memberCopy}><Text style={styles.memberName}>{displayName(member)}</Text><Text style={styles.helper}>{member.role.toLowerCase()}</Text></View></Pressable>;
}

function StatusBadge({ status }: { status: string }) {
  const good = status === "APPROVED";
  const warning = status === "IN_PROGRESS" || status === "PENDING";
  const changed = status === "CHANGES_REQUESTED";
  const bad = status === "REJECTED" || status === "CANCELLED";
  const label = status in statusNames ? statusNames[status as ApprovalRequest["status"]] : status.toLowerCase().replaceAll("_", " ");
  return <View style={[styles.statusBadge, good ? styles.statusGood : null, warning ? styles.statusWarning : null, changed ? styles.statusChanged : null, bad ? styles.statusBad : null]}><Text style={[styles.statusText, good ? styles.statusGoodText : null, changed ? styles.statusChangedText : null, bad ? styles.statusBadText : null]}>{label}</Text></View>;
}

function RetryMessage({ text, onPress }: { text: string; onPress: () => void }) {
  return <View style={styles.inlineError}><Text style={styles.error}>{text}</Text><Pressable onPress={onPress}><Text style={styles.link}>Retry</Text></Pressable></View>;
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <View style={styles.state}><Text style={styles.sectionTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : <ActivityIndicator color={colors.green} />}{retry ? <Pressable onPress={retry}><Text style={styles.link}>Try again</Text></Pressable> : null}</View>;
}

function displayName(member: { displayName: string | null; user: { name: string } }): string {
  return member.displayName?.trim() || member.user.name;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  statsRow: { flexDirection: "row", gap: 6 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 9 },
  statLabel: { color: colors.muted, fontSize: 7, fontWeight: "800", letterSpacing: 0.6 },
  statValue: { color: colors.ink, fontSize: 19, fontWeight: "800", marginTop: 4 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7 },
  primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 9, fontWeight: "800" },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  cancelButton: { borderWidth: 1, borderColor: colors.redWash, backgroundColor: colors.redWash, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center" },
  cancelText: { color: colors.red, fontSize: 9, fontWeight: "800" },
  viewTabs: { flexDirection: "row", gap: 5, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 6 },
  viewTab: { flex: 1, borderRadius: 9, alignItems: "center", paddingVertical: 8 },
  viewTabActive: { backgroundColor: colors.greenWash },
  viewText: { color: colors.muted, fontSize: 8, fontWeight: "700", textAlign: "center" },
  viewTextActive: { color: colors.greenDark },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 3 },
  formCard: { gap: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  label: { color: colors.ink, fontSize: 9, fontWeight: "800", marginTop: 2 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 9, color: colors.ink, fontSize: 11 },
  multiline: { minHeight: 65, textAlignVertical: "top" },
  stageCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 11, padding: 9, gap: 7 },
  stageComplete: { backgroundColor: colors.greenWash },
  stageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stageTitle: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  choiceSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  choiceText: { color: colors.muted, fontSize: 8, fontWeight: "700" },
  choiceTextActive: { color: colors.greenDark },
  helper: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  memberOption: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  memberCopy: { flex: 1, gap: 2 },
  memberName: { color: colors.text, fontSize: 9, fontWeight: "700" },
  checkbox: { width: 17, height: 17, borderWidth: 1, borderColor: colors.line, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  checkboxActive: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: colors.surface, fontSize: 9, fontWeight: "800" },
  sourceChoice: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 9, padding: 8 },
  sourceSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  radio: { width: 15, height: 15, borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  radioSelected: { borderWidth: 5, borderColor: colors.green },
  fileOption: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 3 },
  requestCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10 },
  requestSelected: { borderColor: colors.green, backgroundColor: colors.greenWash },
  requestCopy: { flex: 1, gap: 3 },
  requestTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  statusBadge: { alignSelf: "flex-start", backgroundColor: colors.sand, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 5 },
  statusText: { color: colors.ink, fontSize: 7, fontWeight: "800" },
  statusGood: { backgroundColor: colors.greenWash },
  statusGoodText: { color: colors.greenDark },
  statusWarning: { backgroundColor: colors.sand },
  statusChanged: { backgroundColor: "#FFF4D8" },
  statusChangedText: { color: "#775613" },
  statusBad: { backgroundColor: colors.redWash },
  statusBadText: { color: colors.red },
  empty: { alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 18 },
  emptyTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  detailCard: { gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  description: { color: colors.text, fontSize: 9, lineHeight: 15 },
  detailSection: { gap: 7, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9 },
  approverRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 6 },
  attachment: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 8 },
  link: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  activityRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  activityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green, marginTop: 4 },
  actionPanel: { gap: 7, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9 },
  templateRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: colors.line },
  error: { color: colors.red, fontSize: 9, lineHeight: 14 },
  inlineError: { gap: 5, padding: 8, borderRadius: 9, backgroundColor: colors.redWash },
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 9 },
});
