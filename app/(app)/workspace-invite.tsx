import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getWorkspaceChoices, getWorkspaceFolderChoices, inviteWorkspaceMember, type WorkspaceRole } from "@/workspaces/api";
import { colors } from "@/ui/theme";

const presets = {
  "View only": ["viewFolder", "viewFiles"],
  "Upload access": ["viewFolder", "viewFiles", "uploadFiles"],
  "Editor": ["viewFolder", "viewFiles", "uploadFiles", "editFiles", "renameFiles", "createSubfolders", "manageContents"],
} as const;

type PresetName = keyof typeof presets;

export default function WorkspaceInviteScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ workspaceId?: string | string[] }>();
  const routeWorkspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspaces = workspacesQuery.data ?? [];
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(routeWorkspaceId ?? null);
  const workspace = workspaces.find((item) => item.id === selectedWorkspaceId) ?? workspaces[0] ?? null;
  const workspaceId = workspace?.id ?? null;
  const isOwner = workspace?.role === "OWNER";
  const canInvite = isOwner || workspace?.role === "ADMIN";
  const foldersQuery = useQuery({
    queryKey: ["workspace-invite-folders", workspaceId],
    queryFn: () => getWorkspaceFolderChoices(workspaceId!),
    enabled: Boolean(workspaceId && canInvite),
  });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Exclude<WorkspaceRole, "OWNER">>("STAFF");
  const [preset, setPreset] = useState<PresetName>("Editor");
  const [inherit, setInherit] = useState(true);
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (workspaces.length && !workspaces.some((item) => item.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(
        workspaces.some((item) => item.id === routeWorkspaceId) ? routeWorkspaceId! : workspaces[0]!.id,
      );
    }
  }, [routeWorkspaceId, selectedWorkspaceId, workspaces]);

  useEffect(() => {
    setFolderIds((current) => current.filter((id) => foldersQuery.data?.some((folder) => folder.id === id)));
  }, [foldersQuery.data]);

  const invite = useMutation({
    mutationFn: () => {
      if (!workspaceId) throw new Error("Select a workspace before sending an invitation.");
      const initialPermissions = role === "ADMIN" ? [] : folderIds.map((folderId) => ({
        folderId,
        effect: "GRANT" as const,
        permissionKeys: [...presets[preset]],
        inherit,
      }));
      return inviteWorkspaceMember(workspaceId, {
        email: email.trim(),
        ...(name.trim() ? { name: name.trim() } : {}),
        role,
        initialPermissions,
      });
    },
    onSuccess: async () => {
      if (workspaceId) {
        await queryClient.invalidateQueries({ queryKey: ["workspace-invitations", workspaceId] });
        await queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      }
      router.replace({ pathname: "/(app)/workspace-invitations", params: { workspaceId: workspaceId ?? "" } });
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "The invitation could not be sent."),
  });

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);

  function toggleFolder(folderId: string) {
    setFolderIds((current) => current.includes(folderId) ? current.filter((id) => id !== folderId) : [...current, folderId]);
  }

  function submit() {
    setError("");
    if (!workspace || !canInvite) {
      setError("Only workspace owners and administrators can invite members.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid work email address.");
      return;
    }
    if (role !== "ADMIN" && folderIds.length === 0) {
      setError("Choose at least one folder to grant initial access.");
      return;
    }
    invite.mutate();
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>BUSINESS · INVITATIONS</Text>
        <Text style={styles.title}>Invite a teammate</Text>
        <Text style={styles.subtitle}>Send a secure invitation and start with the right level of access.</Text>
      </View>
      {workspacesQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
      {workspacesQuery.isError ? <Text accessibilityRole="alert" style={styles.error}>{message(workspacesQuery.error)}</Text> : null}
      {workspaces.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workspaceChoices}>
          {workspaces.map((item) => (
            <Pressable key={item.id} onPress={() => setSelectedWorkspaceId(item.id)} style={[styles.chip, workspace?.id === item.id ? styles.chipSelected : null]}>
              <Text style={[styles.chipText, workspace?.id === item.id ? styles.chipTextSelected : null]}>{item.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : workspace ? <Text style={styles.workspace}>{workspace.name} · {workspace.role.toLowerCase()}</Text> : null}

      {workspace && !canInvite ? <Text style={styles.error}>Only workspace owners and administrators can invite members.</Text> : null}
      <View style={styles.card}>
        <Text style={styles.step}>01 · INVITATION</Text>
        <Text style={styles.sectionTitle}>Who should join?</Text>
        <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Work email" placeholderTextColor={colors.muted} style={styles.input} value={email} />
        <TextInput autoCapitalize="words" onChangeText={setName} placeholder="Name (optional)" placeholderTextColor={colors.muted} style={styles.input} value={name} />
      </View>

      <View style={styles.card}>
        <Text style={styles.step}>02 · ROLE</Text>
        <Text style={styles.sectionTitle}>Choose their workspace role</Text>
        {(["STAFF", "MANAGER", ...(isOwner ? ["ADMIN" as const] : [])] as const).map((item) => (
          <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: role === item }} onPress={() => setRole(item)} style={[styles.roleOption, role === item ? styles.roleSelected : null]}>
            <View style={styles.roleCopy}>
              <Text style={styles.roleTitle}>{roleLabel(item)}</Text>
              <Text style={styles.roleDetail}>{roleDescription(item)}</Text>
            </View>
            <Text style={styles.radio}>{role === item ? "●" : "○"}</Text>
          </Pressable>
        ))}
        {!isOwner ? <Text style={styles.helper}>Only the workspace owner can invite an administrator.</Text> : null}
      </View>

      {role !== "ADMIN" ? (
        <View style={styles.card}>
          <Text style={styles.step}>03 · STARTING ACCESS</Text>
          <Text style={styles.sectionTitle}>Choose folders</Text>
          <Text style={styles.helper}>Folder access is granted by the server and can inherit to subfolders.</Text>
          {foldersQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
          {foldersQuery.isError ? <Text accessibilityRole="alert" style={styles.error}>{message(foldersQuery.error)}</Text> : null}
          {!foldersQuery.isPending && !foldersQuery.isError && folders.length === 0 ? (
            <Text style={styles.helper}>No accessible folders are available. Create a shared folder before inviting a scoped member.</Text>
          ) : null}
          {folders.map((folder) => {
            const checked = folderIds.includes(folder.id);
            return (
              <Pressable key={folder.id} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => toggleFolder(folder.id)} style={styles.folderRow}>
                <View style={[styles.checkbox, checked ? styles.checkboxSelected : null]}><Text style={styles.checkmark}>{checked ? "✓" : ""}</Text></View>
                <View style={styles.folderCopy}>
                  <Text style={styles.folderName}>{folder.name}</Text>
                  {folder.parentFolderId ? <Text style={styles.helper}>Subfolder · existing inherited access is preserved</Text> : null}
                </View>
              </Pressable>
            );
          })}
          {folderIds.length ? (
            <>
              <Text style={styles.label}>Permission preset</Text>
              {(Object.keys(presets) as PresetName[]).map((item) => (
                <Pressable key={item} onPress={() => setPreset(item)} style={[styles.preset, preset === item ? styles.presetSelected : null]}>
                  <Text style={[styles.presetText, preset === item ? styles.roleTitle : null]}>{item}</Text>
                  <Text style={styles.radio}>{preset === item ? "●" : "○"}</Text>
                </Pressable>
              ))}
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: inherit }} onPress={() => setInherit((value) => !value)} style={styles.inheritRow}>
                <View style={[styles.checkbox, inherit ? styles.checkboxSelected : null]}><Text style={styles.checkmark}>{inherit ? "✓" : ""}</Text></View>
                <Text style={styles.helper}>Include current and future subfolders</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.notice}><Text style={styles.noticeTitle}>Workspace-wide access</Text><Text style={styles.helper}>Administrators have workspace-wide access. Folder rules are not attached to administrator invitations.</Text></View>
      )}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={invite.isPending || !canInvite || foldersQuery.isPending} onPress={submit} style={[styles.submit, invite.isPending || !canInvite ? styles.disabled : null]}>
        <Text style={styles.submitText}>{invite.isPending ? "Sending invitation…" : "Send invitation"}</Text>
      </Pressable>
      <Text style={styles.helper}>Invitation links expire after 7 days. The API enforces role, capacity, and permission rules.</Text>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
    </ScrollView>
  );
}

function roleLabel(role: WorkspaceRole): string {
  return { OWNER: "Business owner", ADMIN: "Administrator", MANAGER: "Manager", STAFF: "Staff member" }[role];
}

function roleDescription(role: WorkspaceRole): string {
  return role === "ADMIN"
    ? "Manage members, folders, and workspace files."
    : role === "MANAGER"
      ? "Work in assigned folders; access is scoped per folder."
      : "Work only in folders assigned to them.";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36, gap: 13 },
  header: { gap: 6 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  workspace: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  workspaceChoices: { gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  chipSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  chipTextSelected: { color: colors.greenDark },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 15, gap: 10 },
  step: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: colors.ink },
  roleOption: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  roleSelected: { borderColor: colors.green, backgroundColor: colors.greenWash },
  roleCopy: { flex: 1, gap: 3 },
  roleTitle: { color: colors.greenDark, fontSize: 12, fontWeight: "800" },
  roleDetail: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  radio: { color: colors.greenDark, fontSize: 14 },
  helper: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  folderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: colors.line, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: colors.surface, fontSize: 12, fontWeight: "800" },
  folderCopy: { flex: 1, gap: 2 },
  folderName: { color: colors.text, fontSize: 12, fontWeight: "700" },
  label: { color: colors.ink, fontSize: 11, fontWeight: "800", marginTop: 5 },
  preset: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10 },
  presetSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  presetText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  inheritRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 4 },
  notice: { backgroundColor: colors.greenWash, borderRadius: 14, padding: 14, gap: 5 },
  noticeTitle: { color: colors.greenDark, fontSize: 12, fontWeight: "800" },
  error: { color: colors.red, fontSize: 12, lineHeight: 18 },
  submit: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitText: { color: colors.surface, fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  back: { color: colors.greenDark, fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 8 },
});
