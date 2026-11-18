import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuthStore } from "@/auth/auth-store";
import {
  getWorkspaceChoices,
  getWorkspaceMember,
  getWorkspaceMemberActivity,
  removeWorkspaceMember,
  setWorkspaceMemberStatus,
  updateWorkspaceMember,
  type WorkspaceActivity,
  type WorkspaceRole,
} from "@/workspaces/api";
import { colors } from "@/ui/theme";

export default function WorkspaceMemberScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const params = useLocalSearchParams<{ memberId?: string | string[]; workspaceId?: string | string[] }>();
  const memberId = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;
  const workspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspace = workspacesQuery.data?.find((item) => item.id === workspaceId) ?? null;
  const isOwner = workspace?.role === "OWNER";
  const canManage = isOwner || workspace?.role === "ADMIN";
  const memberQuery = useQuery({
    queryKey: ["workspace-member", workspaceId, memberId],
    queryFn: () => getWorkspaceMember(workspaceId!, memberId!),
    enabled: Boolean(workspaceId && memberId && canManage),
  });
  const activityQuery = useQuery({
    queryKey: ["workspace-member-activity", workspaceId, memberId],
    queryFn: () => getWorkspaceMemberActivity(workspaceId!, memberId!),
    enabled: Boolean(workspaceId && memberId && canManage),
  });
  const member = memberQuery.data;
  const [name, setName] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("STAFF");
  const [error, setError] = useState("");

  useEffect(() => {
    if (member) {
      setName(member.displayName?.trim() || member.user.name);
      setRole(member.role);
    }
  }, [member]);

  const save = useMutation({
    mutationFn: () => {
      if (!workspaceId || !member) throw new Error("Member details are not ready.");
      const cleanName = name.trim();
      if (!cleanName) throw new Error("Member name cannot be empty.");
      return updateWorkspaceMember(workspaceId, member.id, {
        ...(role !== member.role && role !== "OWNER" ? { role } : {}),
        ...(cleanName !== (member.displayName ?? member.user.name) ? { name: cleanName } : {}),
      });
    },
    onSuccess: async () => {
      setError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-member", workspaceId, memberId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] }),
      ]);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Member details could not be saved."),
  });

  const lifecycle = useMutation({
    mutationFn: async (action: "restore" | "suspend" | "remove") => {
      if (!workspaceId || !member) throw new Error("Member details are not ready.");
      if (action === "remove") return removeWorkspaceMember(workspaceId, member.id);
      return setWorkspaceMemberStatus(workspaceId, member.id, action === "restore" ? "ACTIVE" : "SUSPENDED");
    },
    onSuccess: async (_, action) => {
      if (action === "remove") {
        await queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
        router.replace({ pathname: "/(app)/workspace-team", params: { workspaceId: workspaceId ?? "" } });
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-member", workspaceId, memberId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] }),
      ]);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Member access could not be changed."),
  });

  function confirmLifecycle(action: "suspend" | "remove") {
    if (!member) return;
    const display = member.displayName?.trim() || member.user.name;
    Alert.alert(
      action === "remove" ? "Remove member?" : "Suspend member?",
      action === "remove"
        ? `${display} will lose access and all folder permissions will be revoked.`
        : `${display} will immediately lose access to this workspace.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: action === "remove" ? "Remove" : "Suspend", style: "destructive", onPress: () => lifecycle.mutate(action) },
      ],
    );
  }

  const isSelf = Boolean(member && userId === member.user.id);
  const mayManageAdmin = isOwner || member?.role !== "ADMIN";
  const availableRoles: WorkspaceRole[] = ["STAFF", "MANAGER", ...(isOwner ? ["ADMIN" as const] : [])];

  if (workspacesQuery.isPending || (canManage && memberQuery.isPending)) return <State title="Loading member…" />;
  if (workspacesQuery.isError) return <State title="Workspace could not load" detail={message(workspacesQuery.error)} />;
  if (!workspace) return <State title="Workspace not found" detail="Return to the team list and select a workspace." />;
  if (!canManage) return <State title="Member details are restricted" detail="Only workspace owners and administrators can view and manage member records." />;
  if (memberQuery.isError) return <State title="Member details couldn’t load" detail={message(memberQuery.error)} retry={() => void memberQuery.refetch()} />;
  if (!member) return <State title="Member not found" detail="This member may have been removed from the workspace." />;

  const displayName = member.displayName?.trim() || member.user.name;
  const cannotManage = member.role === "OWNER" || isSelf || !mayManageAdmin;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>BUSINESS · MEMBER</Text>
        <Text style={styles.title}>{displayName}</Text>
        <Text style={styles.subtitle}>{member.user.email} · {workspace.name}</Text>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.card}>
        <View style={styles.infoRow}><Text style={styles.label}>Status</Text><Text style={styles.value}>{member.status === "ACTIVE" ? "Active" : "Suspended"}</Text></View>
        <View style={styles.infoRow}><Text style={styles.label}>Joined</Text><Text style={styles.value}>{formatDate(member.joinedAt)}</Text></View>
        <View style={styles.infoRow}><Text style={styles.label}>Accessible folders</Text><Text style={styles.value}>{member.accessibleFolderCount}</Text></View>
        <View style={styles.infoRow}><Text style={styles.label}>Permission rules</Text><Text style={styles.value}>{member._count?.permissions ?? 0}</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Member profile and role</Text>
        <Text style={styles.label}>Display name</Text>
        <TextInput editable={!cannotManage} onChangeText={setName} style={[styles.input, cannotManage ? styles.disabled : null]} value={name} />
        <Text style={styles.label}>Workspace role</Text>
        <View style={styles.roleList}>
          {availableRoles.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityState={{ selected: role === item, disabled: cannotManage || (item === "ADMIN" && !isOwner) }}
              disabled={cannotManage}
              onPress={() => setRole(item)}
              style={[styles.roleChip, role === item ? styles.roleSelected : null, cannotManage ? styles.disabled : null]}
            >
              <Text style={[styles.roleText, role === item ? styles.roleTextSelected : null]}>{roleLabel(item)}</Text>
            </Pressable>
          ))}
        </View>
        {cannotManage ? <Text style={styles.helper}>The owner, your own account, or an administrator outside the owner role cannot be changed here.</Text> : null}
        <Pressable accessibilityRole="button" disabled={cannotManage || save.isPending} onPress={() => save.mutate()} style={[styles.primary, cannotManage ? styles.disabled : null]}>
          <Text style={styles.primaryText}>{save.isPending ? "Saving…" : "Save member details"}</Text>
        </Pressable>
      </View>

      {member.role !== "OWNER" && member.role !== "ADMIN" ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Folder permissions</Text>
          <Text style={styles.helper}>Grant or restrict specific actions on shared folders.</Text>
          <Link href={{ pathname: "/(app)/workspace-member/[memberId]/permissions", params: { memberId: member.id, workspaceId: workspace.id } }} asChild>
            <Pressable style={styles.secondary}><Text style={styles.secondaryText}>Manage folder access</Text></Pressable>
          </Link>
        </View>
      ) : null}

      {member.role !== "OWNER" && !isSelf && mayManageAdmin ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Workspace access</Text>
          {member.status === "ACTIVE" ? (
            <Pressable disabled={lifecycle.isPending} onPress={() => confirmLifecycle("suspend")} style={styles.secondary}>
              <Text style={styles.secondaryText}>{lifecycle.isPending ? "Working…" : "Suspend access"}</Text>
            </Pressable>
          ) : (
            <Pressable disabled={lifecycle.isPending} onPress={() => lifecycle.mutate("restore")} style={styles.secondary}>
              <Text style={styles.secondaryText}>{lifecycle.isPending ? "Working…" : "Restore access"}</Text>
            </Pressable>
          )}
          <Pressable disabled={lifecycle.isPending} onPress={() => confirmLifecycle("remove")} style={styles.danger}>
            <Text style={styles.dangerText}>Remove from workspace</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Member activity</Text>
        {activityQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
        {activityQuery.isError ? <Text style={styles.error}>{message(activityQuery.error)}</Text> : null}
        {(activityQuery.data ?? []).map((item) => <ActivityRow key={item.id} item={item} />)}
        {activityQuery.data?.length === 0 ? <Text style={styles.helper}>No activity is recorded for this member.</Text> : null}
      </View>
      <Link href={{ pathname: "/(app)/workspace-team", params: { workspaceId: workspace.id } }} asChild>
        <Pressable><Text style={styles.back}>Back to team</Text></Pressable>
      </Link>
    </ScrollView>
  );
}

function ActivityRow({ item }: { item: WorkspaceActivity }) {
  return (
    <View style={styles.activity}>
      <Text style={styles.activityTitle}>{formatAction(item.action)}</Text>
      <Text style={styles.helper}>{item.actor?.name ?? item.actor?.email ?? "Workspace system"} · {formatDate(item.createdAt)}</Text>
    </View>
  );
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.helper}>{detail}</Text> : <ActivityIndicator color={colors.green} />}
      {retry ? <Pressable onPress={retry}><Text style={styles.back}>Try again</Text></Pressable> : null}
    </View>
  );
}

function roleLabel(role: WorkspaceRole): string {
  return { OWNER: "Owner", ADMIN: "Admin", MANAGER: "Manager", STAFF: "Staff" }[role];
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
  page: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36, gap: 12 },
  header: { gap: 5 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  value: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, color: colors.ink, fontSize: 12 },
  roleList: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  roleChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  roleSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  roleText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  roleTextSelected: { color: colors.greenDark },
  primary: { backgroundColor: colors.green, borderRadius: 11, alignItems: "center", paddingVertical: 12 },
  primaryText: { color: colors.surface, fontSize: 11, fontWeight: "800" },
  secondary: { backgroundColor: colors.greenWash, borderRadius: 11, alignItems: "center", paddingVertical: 12 },
  secondaryText: { color: colors.greenDark, fontSize: 11, fontWeight: "800" },
  danger: { borderWidth: 1, borderColor: colors.redWash, borderRadius: 11, alignItems: "center", paddingVertical: 12 },
  dangerText: { color: colors.red, fontSize: 11, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  error: { color: colors.red, fontSize: 12, lineHeight: 18 },
  activity: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9, gap: 4 },
  activityTitle: { color: colors.text, fontSize: 11, fontWeight: "800" },
  state: { alignItems: "center", gap: 10, padding: 22 },
  back: { color: colors.greenDark, fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 8 },
});
