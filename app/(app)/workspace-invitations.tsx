import { Link, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getWorkspaceChoices,
  getWorkspaceInvitations,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
  type WorkspaceInvitation,
  type WorkspaceInvitationStatus,
} from "@/workspaces/api";
import { colors } from "@/ui/theme";

type StatusFilter = "ALL" | WorkspaceInvitationStatus;

export default function WorkspaceInvitationsScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ workspaceId?: string | string[] }>();
  const routeWorkspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspaces = workspacesQuery.data ?? [];
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(routeWorkspaceId ?? null);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [actionError, setActionError] = useState("");
  const workspace = workspaces.find((item) => item.id === selectedWorkspaceId) ?? workspaces[0] ?? null;
  const workspaceId = workspace?.id ?? null;
  const canManage = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  useEffect(() => {
    if (workspaces.length && !workspaces.some((item) => item.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(
        workspaces.some((item) => item.id === routeWorkspaceId) ? routeWorkspaceId! : workspaces[0]!.id,
      );
    }
  }, [routeWorkspaceId, selectedWorkspaceId, workspaces]);

  const invitationsQuery = useQuery({
    queryKey: ["workspace-invitations", workspaceId],
    queryFn: () => getWorkspaceInvitations(workspaceId!),
    enabled: Boolean(workspaceId && canManage),
  });
  const refresh = async () => {
    if (workspaceId) await queryClient.invalidateQueries({ queryKey: ["workspace-invitations", workspaceId] });
  };
  const action = useMutation({
    mutationFn: ({ invitation, type }: { invitation: WorkspaceInvitation; type: "resend" | "revoke" }) => {
      if (!workspaceId) throw new Error("Select a workspace before changing invitations.");
      if (type === "resend") {
        return resendWorkspaceInvitation(workspaceId, invitation.id).then(() => undefined);
      }
      return revokeWorkspaceInvitation(workspaceId, invitation.id);
    },
    onSuccess: refresh,
    onError: (error) => setActionError(error instanceof Error ? error.message : "The invitation could not be updated."),
  });

  const invitations = invitationsQuery.data ?? [];
  const visible = filter === "ALL" ? invitations : invitations.filter((item) => item.status === filter);

  function revoke(invitation: WorkspaceInvitation) {
    setActionError("");
    Alert.alert("Revoke invitation?", `${invitation.email} will no longer be able to use this invitation.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Revoke", style: "destructive", onPress: () => action.mutate({ invitation, type: "revoke" }) },
    ]);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>BUSINESS · PEOPLE</Text>
        <Text style={styles.title}>Invitations</Text>
        <Text style={styles.subtitle}>Track pending, accepted, expired, and revoked team invitations.</Text>
      </View>
      {workspacesQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
      {workspacesQuery.isError ? <Text style={styles.error}>{message(workspacesQuery.error)}</Text> : null}
      {workspaces.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workspaceChoices}>
          {workspaces.map((item) => (
            <Pressable key={item.id} onPress={() => setSelectedWorkspaceId(item.id)} style={[styles.chip, workspace?.id === item.id ? styles.chipSelected : null]}>
              <Text style={[styles.chipText, workspace?.id === item.id ? styles.chipTextSelected : null]}>{item.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : workspace ? <Text style={styles.workspace}>{workspace.name} · {workspace.role.toLowerCase()}</Text> : null}

      {workspace && !canManage ? <State title="Invitation management is restricted" detail="Only workspace owners and administrators can manage invitations." /> : null}
      {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
      {invitationsQuery.isError ? <State title="Invitations couldn’t load" detail={message(invitationsQuery.error)} retry={() => void invitationsQuery.refetch()} /> : null}

      {canManage ? (
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.sectionTitle}>{invitations.length} total</Text>
            <Link href={{ pathname: "/(app)/workspace-invite", params: { workspaceId: workspaceId ?? "" } }} asChild>
              <Pressable style={styles.primaryButton}><Text style={styles.primaryText}>Invite</Text></Pressable>
            </Link>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {(["ALL", "PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] as const).map((item) => (
              <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item ? styles.filterSelected : null]}>
                <Text style={[styles.filterText, filter === item ? styles.filterTextSelected : null]}>{item === "ALL" ? "All" : statusLabel(item)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {invitationsQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
          {visible.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              busy={action.isPending && action.variables?.invitation.id === invitation.id}
              onResend={() => { setActionError(""); action.mutate({ invitation, type: "resend" }); }}
              onRevoke={() => revoke(invitation)}
            />
          ))}
          {!invitationsQuery.isPending && visible.length === 0 ? (
            <Text style={styles.empty}>{filter === "ALL" ? "No invitations have been sent yet." : `No ${statusLabel(filter).toLowerCase()} invitations.`}</Text>
          ) : null}
        </View>
      ) : null}
      <Link href={{ pathname: "/(app)/workspace-team", params: { workspaceId: workspaceId ?? "" } }} asChild>
        <Pressable><Text style={styles.back}>Back to team</Text></Pressable>
      </Link>
    </ScrollView>
  );
}

function InvitationRow({
  invitation,
  busy,
  onResend,
  onRevoke,
}: {
  invitation: WorkspaceInvitation;
  busy: boolean;
  onResend: () => void;
  onRevoke: () => void;
}) {
  return (
    <View style={styles.invitation}>
      <View style={styles.invitationHead}>
        <View style={styles.invitationCopy}>
          <Text numberOfLines={1} style={styles.email}>{invitation.email}</Text>
          <Text style={styles.details}>{invitation.name?.trim() || "Name not provided"} · {roleLabel(invitation.role)}</Text>
        </View>
        <View style={[styles.status, invitation.status !== "PENDING" ? styles.statusQuiet : null]}>
          <Text style={styles.statusText}>{statusLabel(invitation.status)}</Text>
        </View>
      </View>
      <Text style={styles.details}>
        {invitation.status === "ACCEPTED"
          ? `Accepted ${formatDate(invitation.acceptedAt)}`
          : `Expires ${formatDate(invitation.expiresAt)}`}
      </Text>
      {invitation.status === "PENDING" || invitation.status === "EXPIRED" ? (
        <View style={styles.actionRow}>
          <Pressable disabled={busy} onPress={onResend} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{busy ? "Working…" : invitation.status === "EXPIRED" ? "Resend invitation" : "Resend"}</Text>
          </Pressable>
          {invitation.status === "PENDING" ? (
            <Pressable disabled={busy} onPress={onRevoke} style={styles.dangerButton}><Text style={styles.dangerText}>Revoke</Text></Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function State({ title, detail, retry }: { title: string; detail: string; retry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.details}>{detail}</Text>
      {retry ? <Pressable onPress={retry} style={styles.secondaryButton}><Text style={styles.secondaryText}>Try again</Text></Pressable> : null}
    </View>
  );
}

function statusLabel(status: StatusFilter): string {
  return status.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function roleLabel(role: WorkspaceInvitation["role"]): string {
  return { OWNER: "Owner", ADMIN: "Administrator", MANAGER: "Manager", STAFF: "Staff" }[role];
}

function formatDate(value: string | null): string {
  if (!value) return "date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36, gap: 13 },
  header: { gap: 6 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  workspace: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  workspaceChoices: { gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  chipSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  chipTextSelected: { color: colors.greenDark },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 14, gap: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 9 },
  primaryText: { color: colors.surface, fontSize: 11, fontWeight: "800" },
  filters: { gap: 6 },
  filterChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  filterSelected: { borderColor: colors.green, backgroundColor: colors.greenWash },
  filterText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  filterTextSelected: { color: colors.greenDark },
  invitation: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 8 },
  invitationHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  invitationCopy: { flex: 1, gap: 3 },
  email: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  details: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  status: { backgroundColor: colors.greenWash, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  statusQuiet: { backgroundColor: colors.sand },
  statusText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 8 },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: "center" },
  secondaryText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  dangerButton: { borderWidth: 1, borderColor: colors.redWash, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: "center" },
  dangerText: { color: colors.red, fontSize: 10, fontWeight: "800" },
  empty: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingVertical: 12 },
  error: { color: colors.red, fontSize: 12, lineHeight: 18 },
  state: { alignItems: "center", gap: 9, backgroundColor: colors.surface, padding: 18, borderRadius: 16 },
  back: { color: colors.greenDark, fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 8 },
});
