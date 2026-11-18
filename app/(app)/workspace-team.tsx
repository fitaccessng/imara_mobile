import { Link } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuthStore } from "@/auth/auth-store";
import {
  getWorkspaceActivity,
  getWorkspaceChoices,
  getWorkspaceInvitations,
  getWorkspaceMembers,
  removeWorkspaceMember,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
  setWorkspaceMemberStatus,
  type WorkspaceActivity,
  type WorkspaceInvitation,
  type WorkspaceMember,
  type WorkspaceMemberStatus,
} from "@/workspaces/api";
import { colors } from "@/ui/theme";

type MemberFilter = "ALL" | "ACTIVE" | "SUSPENDED";

export default function WorkspaceTeamScreen() {
  const queryClient = useQueryClient();
  const preferredWorkspaceId = useAuthStore((state) => state.workspaceId);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(preferredWorkspaceId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("ALL");
  const [actionError, setActionError] = useState("");

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspaces = workspacesQuery.data ?? [];
  const workspace = workspaces.find((item) => item.id === selectedWorkspaceId) ?? workspaces[0] ?? null;
  const workspaceId = workspace?.id ?? null;
  const canManageTeam = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  useEffect(() => {
    if (workspaces.length && !workspaces.some((item) => item.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(
        workspaces.some((item) => item.id === preferredWorkspaceId)
          ? preferredWorkspaceId
          : workspaces[0]?.id ?? null,
      );
    }
  }, [preferredWorkspaceId, selectedWorkspaceId, workspaces]);

  const membersQuery = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => getWorkspaceMembers(workspaceId!),
    enabled: Boolean(workspaceId && canManageTeam),
  });
  const invitationsQuery = useQuery({
    queryKey: ["workspace-invitations", workspaceId],
    queryFn: () => getWorkspaceInvitations(workspaceId!),
    enabled: Boolean(workspaceId && canManageTeam),
  });
  const activityQuery = useQuery({
    queryKey: ["workspace-activity", workspaceId],
    queryFn: () => getWorkspaceActivity(workspaceId!),
    enabled: Boolean(workspaceId && canManageTeam),
  });

  const refreshTeam = async () => {
    if (!workspaceId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-activity", workspaceId] }),
    ]);
  };

  const memberAction = useMutation({
    mutationFn: async ({ member, action }: { member: WorkspaceMember; action: "restore" | "suspend" | "remove" }) => {
      if (!workspaceId) throw new Error("Select a workspace before changing member access.");
      if (action === "remove") return removeWorkspaceMember(workspaceId, member.id);
      return setWorkspaceMemberStatus(
        workspaceId,
        member.id,
        action === "restore" ? "ACTIVE" : "SUSPENDED",
      );
    },
    onSuccess: refreshTeam,
    onError: (error) => setActionError(error instanceof Error ? error.message : "The member action failed."),
  });

  const invitationAction = useMutation({
    mutationFn: async ({ invitation, action }: { invitation: WorkspaceInvitation; action: "resend" | "revoke" }) => {
      if (!workspaceId) throw new Error("Select a workspace before changing invitations.");
      if (action === "resend") return resendWorkspaceInvitation(workspaceId, invitation.id);
      return revokeWorkspaceInvitation(workspaceId, invitation.id);
    },
    onSuccess: refreshTeam,
    onError: (error) => setActionError(error instanceof Error ? error.message : "The invitation action failed."),
  });

  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const active = members.filter((member) => member.status === "ACTIVE").length;
  const suspended = members.filter((member) => member.status === "SUSPENDED").length;
  const pendingInvitations = invitations.filter((invitation) => invitation.status === "PENDING");
  const visibleMembers = members.filter((member) => {
    const statusMatches = filter === "ALL" || member.status === filter;
    const haystack = `${member.displayName ?? member.user.name} ${member.user.email} ${member.role}`.toLowerCase();
    return statusMatches && haystack.includes(search.trim().toLowerCase());
  });

  function requestMemberAction(member: WorkspaceMember, action: "restore" | "suspend" | "remove") {
    setActionError("");
    if (action === "restore") {
      memberAction.mutate({ member, action });
      return;
    }
    const name = member.displayName?.trim() || member.user.name;
    Alert.alert(
      action === "remove" ? "Remove team member?" : "Suspend member access?",
      action === "remove"
        ? `${name} will lose access to this workspace and its assigned folders.`
        : `${name} will immediately lose access to this workspace.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "remove" ? "Remove" : "Suspend",
          style: "destructive",
          onPress: () => memberAction.mutate({ member, action }),
        },
      ],
    );
  }

  function requestInvitationAction(invitation: WorkspaceInvitation, action: "resend" | "revoke") {
    setActionError("");
    if (action === "resend") {
      invitationAction.mutate({ invitation, action });
      return;
    }
    Alert.alert("Revoke invitation?", `${invitation.email} will no longer be able to use this invitation.`, [
      { text: "Keep invitation", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: () => invitationAction.mutate({ invitation, action }),
      },
    ]);
  }

  if (workspacesQuery.isPending) return <State title="Loading workspaces…" />;
  if (workspacesQuery.isError) {
    return <State title="Workspaces couldn’t load" detail={message(workspacesQuery.error)} retry={() => void workspacesQuery.refetch()} />;
  }
  if (!workspace) return <State title="No business workspace" detail="A workspace you own or have been invited to will appear here." />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>BUSINESS · PEOPLE</Text>
        <Text style={styles.title}>Your team</Text>
        <Text style={styles.subtitle}>Manage workspace membership, invitations, and access.</Text>
      </View>

      {workspaces.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workspaceList}>
          {workspaces.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: workspace.id === item.id }}
              key={item.id}
              onPress={() => {
                setSelectedWorkspaceId(item.id);
                setActionError("");
              }}
              style={[styles.chip, workspace.id === item.id ? styles.chipSelected : null]}
            >
              <Text style={[styles.chipText, workspace.id === item.id ? styles.chipTextSelected : null]}>{item.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : <Text style={styles.workspaceName}>{workspace.name} · {workspace.role.toLowerCase()}</Text>}

      {!canManageTeam ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Team management is restricted</Text>
          <Text style={styles.body}>Only workspace owners and administrators can manage members and invitations. Access is enforced by IMARA.</Text>
        </View>
      ) : (
        <>
          <View style={styles.metrics}>
            <Metric label="Members" value={membersQuery.data?.length} loading={membersQuery.isPending} />
            <Metric label="Active" value={active} loading={membersQuery.isPending} />
            <Metric label="Invited" value={pendingInvitations.length} loading={invitationsQuery.isPending} />
            <Metric label="Suspended" value={suspended} loading={membersQuery.isPending} />
          </View>

          <View style={styles.actionRow}>
            <Link href={{ pathname: "/(app)/workspace-invite", params: { workspaceId } }} asChild>
              <Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>Invite teammate</Text></Pressable>
            </Link>
            <Link href={{ pathname: "/(app)/workspace-invitations", params: { workspaceId } }} asChild>
              <Pressable style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Invitations</Text></Pressable>
            </Link>
          </View>

          {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
          {membersQuery.isError ? <State title="Members couldn’t load" detail={message(membersQuery.error)} retry={() => void membersQuery.refetch()} /> : null}
          {invitationsQuery.isError ? <State title="Invitations couldn’t load" detail={message(invitationsQuery.error)} retry={() => void invitationsQuery.refetch()} /> : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Members</Text>
            <TextInput
              accessibilityLabel="Search workspace members"
              onChangeText={setSearch}
              placeholder="Search name, email or role"
              placeholderTextColor={colors.muted}
              style={styles.search}
              value={search}
            />
            <View style={styles.filters}>
              {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === item }}
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[styles.filterChip, filter === item ? styles.filterSelected : null]}
                >
                  <Text style={[styles.filterText, filter === item ? styles.filterTextSelected : null]}>
                    {item === "ALL" ? "All" : item === "ACTIVE" ? "Active" : "Suspended"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {membersQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
            {!membersQuery.isPending && members.length === 0 ? <Text style={styles.body}>No workspace members were returned.</Text> : null}
            {visibleMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                workspaceId={workspace.id}
                busy={memberAction.isPending && memberAction.variables?.member.id === member.id}
                isOwner={workspace.role === "OWNER"}
                currentUserId={currentUserId}
                onAction={requestMemberAction}
              />
            ))}
            {!membersQuery.isPending && members.length > 0 && visibleMembers.length === 0 ? (
              <Text style={styles.body}>No members match this search and status filter.</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Recent workspace activity</Text>
              <Link href={{ pathname: "/(app)/workspace-activity", params: { workspaceId } }} asChild>
                <Pressable><Text style={styles.link}>View all</Text></Pressable>
              </Link>
            </View>
            {activityQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
            {activityQuery.isError ? <Text style={styles.error}>{message(activityQuery.error)}</Text> : null}
            {(activityQuery.data ?? []).slice(0, 5).map((item) => <ActivityRow key={item.id} item={item} />)}
            {activityQuery.data?.length === 0 ? <Text style={styles.body}>No activity has been recorded yet.</Text> : null}
          </View>
        </>
      )}
      <Link href="/(app)/workspace" asChild><Pressable><Text style={styles.back}>Back to workspace</Text></Pressable></Link>
    </ScrollView>
  );
}

function MemberRow({
  member,
  workspaceId,
  currentUserId,
  busy,
  isOwner,
  onAction,
}: {
  member: WorkspaceMember;
  workspaceId: string;
  currentUserId?: string;
  busy: boolean;
  isOwner: boolean;
  onAction: (member: WorkspaceMember, action: "restore" | "suspend" | "remove") => void;
}) {
  const name = member.displayName?.trim() || member.user.name;
  const canManage = member.role !== "OWNER" && member.user.id !== currentUserId;
  const canManageAdmin = isOwner || member.role !== "ADMIN";
  return (
    <View style={styles.member}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials(name)}</Text></View>
      <View style={styles.memberMain}>
        <Link href={{ pathname: "/(app)/workspace-member/[memberId]", params: { memberId: member.id, workspaceId } }} asChild>
          <Pressable><Text numberOfLines={1} style={styles.memberName}>{name}</Text></Pressable>
        </Link>
        <Text numberOfLines={1} style={styles.memberEmail}>{member.user.email}</Text>
        <Text style={styles.memberMeta}>{roleName(member.role)} · {member.accessibleFolderCount} folders</Text>
      </View>
      <View style={[styles.statusPill, member.status === "SUSPENDED" ? styles.statusSuspended : null]}>
        <Text style={[styles.statusText, member.status === "SUSPENDED" ? styles.statusSuspendedText : null]}>
          {member.status === "ACTIVE" ? "Active" : "Suspended"}
        </Text>
      </View>
      {canManage && canManageAdmin ? (
        <View style={styles.memberActions}>
          <Link href={{ pathname: "/(app)/workspace-member/[memberId]", params: { memberId: member.id, workspaceId } }} asChild>
            <Pressable accessibilityLabel={`Manage ${name}`} style={styles.smallButton}><Text style={styles.smallButtonText}>Manage</Text></Pressable>
          </Link>
          {member.status === "ACTIVE" ? (
            <Pressable accessibilityLabel={`Suspend ${name}`} disabled={busy} onPress={() => onAction(member, "suspend")} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>{busy ? "…" : "Suspend"}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityLabel={`Restore ${name}`} disabled={busy} onPress={() => onAction(member, "restore")} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>{busy ? "…" : "Restore"}</Text>
            </Pressable>
          )}
          <Pressable accessibilityLabel={`Remove ${name}`} disabled={busy} onPress={() => onAction(member, "remove")} style={[styles.smallButton, styles.removeButton]}>
            <Text style={[styles.smallButtonText, styles.removeText]}>Remove</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ActivityRow({ item }: { item: WorkspaceActivity }) {
  return (
    <View style={styles.activity}>
      <View style={styles.activityDot} />
      <View style={styles.activityCopy}>
        <Text style={styles.activityTitle}>{formatAction(item.action)}</Text>
        <Text style={styles.activityMeta}>{item.actor?.name ?? item.actor?.email ?? "Workspace system"} · {formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{loading ? "—" : value ?? 0}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.cardTitle}>{title}</Text>
      {detail ? <Text style={styles.body}>{detail}</Text> : <ActivityIndicator color={colors.green} />}
      {retry ? <Pressable onPress={retry} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Try again</Text></Pressable> : null}
    </View>
  );
}

function roleName(role: WorkspaceMember["role"]): string {
  return { OWNER: "Owner", ADMIN: "Administrator", MANAGER: "Manager", STAFF: "Staff" }[role];
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "U";
}

function formatAction(action: string): string {
  return action.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36, gap: 14 },
  header: { gap: 6 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  workspaceName: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  workspaceList: { gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  chipSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  chipTextSelected: { color: colors.greenDark },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { flexGrow: 1, flexBasis: "45%", backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 13 },
  metricValue: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  actionRow: { flexDirection: "row", gap: 8 },
  primaryButton: { flex: 1, backgroundColor: colors.green, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 12, fontWeight: "800" },
  secondaryButton: { flex: 1, backgroundColor: colors.greenWash, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  secondaryButtonText: { color: colors.greenDark, fontSize: 12, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 15, gap: 12 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  search: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 13 },
  filters: { flexDirection: "row", gap: 7 },
  filterChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  filterSelected: { borderColor: colors.green, backgroundColor: colors.greenWash },
  filterText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  filterTextSelected: { color: colors.greenDark },
  member: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 9 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenWash },
  avatarText: { color: colors.greenDark, fontSize: 12, fontWeight: "800" },
  memberMain: { position: "absolute", left: 50, top: 12, right: 0, minHeight: 40, justifyContent: "center", gap: 2 },
  memberName: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  memberEmail: { color: colors.muted, fontSize: 11 },
  memberMeta: { color: colors.muted, fontSize: 10, marginTop: 2 },
  statusPill: { position: "absolute", right: 0, top: 55, borderRadius: 999, backgroundColor: colors.greenWash, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  statusSuspended: { backgroundColor: colors.sand },
  statusSuspendedText: { color: colors.text },
  memberActions: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingRight: 76 },
  smallButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  smallButtonText: { color: colors.text, fontSize: 10, fontWeight: "700" },
  removeButton: { borderColor: colors.redWash },
  removeText: { color: colors.red },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { color: colors.greenDark, fontSize: 11, fontWeight: "800" },
  activity: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  activityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green, marginTop: 5 },
  activityCopy: { flex: 1, gap: 3 },
  activityTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  activityMeta: { color: colors.muted, fontSize: 10 },
  body: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  error: { color: colors.red, fontSize: 12, lineHeight: 18 },
  state: { alignItems: "center", gap: 10, padding: 18, backgroundColor: colors.surface, borderRadius: 16 },
  back: { color: colors.greenDark, fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 8 },
});
