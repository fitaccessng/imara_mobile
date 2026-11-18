import { Link, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getWorkspaceChoices,
  getWorkspaceFolderChoices,
  getWorkspaceMember,
  getWorkspaceMemberPermissions,
  replaceWorkspaceMemberPermissions,
  type WorkspaceMemberFolderRule,
  type WorkspacePermissionEffect,
} from "@/workspaces/api";
import { colors } from "@/ui/theme";

const permissionKeys = [
  ["viewFolder", "View folder"],
  ["viewFiles", "View files"],
  ["uploadFiles", "Upload files"],
  ["editFiles", "Edit files"],
  ["renameFiles", "Rename files"],
  ["moveFiles", "Move files"],
  ["downloadFiles", "Download files"],
  ["deleteFiles", "Delete files"],
  ["createSubfolders", "Create subfolders"],
  ["renameFolders", "Rename folders"],
  ["manageContents", "Manage contents"],
  ["shareFiles", "Share files"],
  ["managePermissions", "Manage permissions"],
] as const;

export default function WorkspaceMemberPermissionsScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ memberId?: string | string[]; workspaceId?: string | string[] }>();
  const memberId = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;
  const workspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspace = workspacesQuery.data?.find((item) => item.id === workspaceId) ?? null;
  const canManage = workspace?.role === "OWNER" || workspace?.role === "ADMIN";
  const memberQuery = useQuery({
    queryKey: ["workspace-member", workspaceId, memberId],
    queryFn: () => getWorkspaceMember(workspaceId!, memberId!),
    enabled: Boolean(workspaceId && memberId && canManage),
  });
  const permissionsQuery = useQuery({
    queryKey: ["workspace-member-permissions", workspaceId, memberId],
    queryFn: () => getWorkspaceMemberPermissions(workspaceId!, memberId!),
    enabled: Boolean(workspaceId && memberId && canManage),
  });
  const foldersQuery = useQuery({
    queryKey: ["workspace-invite-folders", workspaceId],
    queryFn: () => getWorkspaceFolderChoices(workspaceId!),
    enabled: Boolean(workspaceId && canManage),
  });

  const [rules, setRules] = useState<WorkspaceMemberFolderRule[]>([]);
  const [newFolderId, setNewFolderId] = useState("");
  const [newEffect, setNewEffect] = useState<WorkspacePermissionEffect>("GRANT");
  const [newKeys, setNewKeys] = useState<string[]>(["viewFolder", "viewFiles"]);
  const [newInherit, setNewInherit] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (permissionsQuery.data) {
      setRules(permissionsQuery.data.permissions.map(({ folderId, effect, permissionKeys: keys, inherit }) => ({
        folderId,
        effect,
        permissionKeys: [...keys],
        inherit,
      })));
    }
  }, [permissionsQuery.data]);

  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const member = memberQuery.data;
  const save = useMutation({
    mutationFn: () => {
      if (!workspaceId || !memberId) throw new Error("Member details are not ready.");
      return replaceWorkspaceMemberPermissions(workspaceId, memberId, rules);
    },
    onSuccess: async () => {
      setError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-member-permissions", workspaceId, memberId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-member", workspaceId, memberId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-folders", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-storage", workspaceId] }),
      ]);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Folder permissions could not be saved."),
  });

  function togglePermission(target: "new" | number, key: string) {
    if (target === "new") {
      setNewKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
      return;
    }
    setRules((current) => current.map((rule, index) => {
      if (index !== target) return rule;
      return {
        ...rule,
        permissionKeys: rule.permissionKeys.includes(key)
          ? rule.permissionKeys.filter((value) => value !== key)
          : [...rule.permissionKeys, key],
      };
    }));
  }

  function addRule() {
    if (!newFolderId) {
      setError("Choose a folder for the new rule.");
      return;
    }
    if (!newKeys.length) {
      setError("Choose at least one permission for the new rule.");
      return;
    }
    if (rules.some((rule) => rule.folderId === newFolderId && rule.effect === newEffect)) {
      setError(`A ${newEffect.toLowerCase()} rule already exists for this folder. Edit that rule instead.`);
      return;
    }
    setRules((current) => [...current, {
      folderId: newFolderId,
      effect: newEffect,
      permissionKeys: [...new Set(newKeys)],
      inherit: newInherit,
    }]);
    setNewFolderId("");
    setError("");
  }

  if (workspacesQuery.isPending || (canManage && (memberQuery.isPending || permissionsQuery.isPending || foldersQuery.isPending))) {
    return <State title="Loading permissions…" />;
  }
  if (workspacesQuery.isError) return <State title="Workspace could not load" detail={message(workspacesQuery.error)} />;
  if (!workspace) return <State title="Workspace not found" detail="Return to the team page and select a workspace." />;
  if (!canManage) return <State title="Permission management is restricted" detail="Only workspace owners and administrators can change member folder rules." />;
  if (memberQuery.isError || permissionsQuery.isError || foldersQuery.isError) {
    const reason = memberQuery.error ?? permissionsQuery.error ?? foldersQuery.error;
    return <State title="Permissions couldn’t load" detail={message(reason)} retry={() => {
      void memberQuery.refetch();
      void permissionsQuery.refetch();
      void foldersQuery.refetch();
    }} />;
  }
  if (!member) return <State title="Member not found" detail="This member may have been removed from the workspace." />;
  if (member.role === "OWNER" || member.role === "ADMIN") {
    return <State title="Folder rules do not apply" detail="Owners and administrators have workspace-wide access controlled by their role." />;
  }

  const existingFolders = new Set(rules.map((rule) => rule.folderId));
  const availableFolders = folders.filter((folder) => !existingFolders.has(folder.id));
  const memberName = member.displayName?.trim() || member.user.name;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>BUSINESS · ACCESS CONTROL</Text>
        <Text style={styles.title}>Folder permissions</Text>
        <Text style={styles.subtitle}>{memberName} · {member.user.email}</Text>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Server-enforced access rules</Text>
        <Text style={styles.helper}>Rules are evaluated along the folder path. Restrictions block inherited grants unless a descendant explicitly grants access. The API validates every change.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current rules · {rules.length}</Text>
        {rules.map((rule, index) => {
          const folder = folderMap.get(rule.folderId);
          return (
            <View key={`${rule.folderId}:${rule.effect}`} style={styles.rule}>
              <View style={styles.ruleHeader}>
                <View style={styles.ruleCopy}>
                  <Text style={styles.folderName}>{folder?.name ?? "Folder unavailable"}</Text>
                  <Text style={[styles.effect, rule.effect === "RESTRICT" ? styles.restrict : null]}>
                    {rule.effect === "GRANT" ? "Grant access" : "Restrict access"}
                  </Text>
                </View>
                <Pressable onPress={() => setRules((current) => current.filter((_, position) => position !== index))} style={styles.removeRule}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
              <View style={styles.effectRow}>
                {(["GRANT", "RESTRICT"] as const).map((effect) => (
                  <Pressable key={effect} onPress={() => setRules((current) => current.map((item, position) => position === index ? { ...item, effect } : item))} style={[styles.effectButton, rule.effect === effect ? styles.effectSelected : null]}>
                    <Text style={[styles.effectButtonText, rule.effect === effect ? styles.effectSelectedText : null]}>{effect === "GRANT" ? "Grant" : "Restrict"}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.permissions}>
                {permissionKeys.map(([key, label]) => {
                  const checked = rule.permissionKeys.includes(key);
                  return <PermissionChip key={key} label={label} checked={checked} onPress={() => togglePermission(index, key)} />;
                })}
              </View>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rule.inherit }} onPress={() => setRules((current) => current.map((item, position) => position === index ? { ...item, inherit: !item.inherit } : item))} style={styles.inheritRow}>
                <View style={[styles.checkbox, rule.inherit ? styles.checked : null]}><Text style={styles.checkmark}>{rule.inherit ? "✓" : ""}</Text></View>
                <Text style={styles.helper}>Inherit to current and future subfolders</Text>
              </Pressable>
            </View>
          );
        })}
        {!rules.length ? <Text style={styles.helper}>No folder-specific rules are configured.</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add a folder rule</Text>
        {availableFolders.length ? availableFolders.map((folder) => (
          <Pressable key={folder.id} onPress={() => setNewFolderId(folder.id)} style={[styles.folderChoice, newFolderId === folder.id ? styles.folderSelected : null]}>
            <Text style={[styles.folderName, newFolderId === folder.id ? styles.selectedText : null]}>{folder.name}</Text>
            <Text style={styles.radio}>{newFolderId === folder.id ? "●" : "○"}</Text>
          </Pressable>
        )) : <Text style={styles.helper}>Every accessible folder already has one rule per effect.</Text>}
        <View style={styles.effectRow}>
          {(["GRANT", "RESTRICT"] as const).map((effect) => (
            <Pressable key={effect} onPress={() => setNewEffect(effect)} style={[styles.effectButton, newEffect === effect ? styles.effectSelected : null]}>
              <Text style={[styles.effectButtonText, newEffect === effect ? styles.effectSelectedText : null]}>{effect === "GRANT" ? "Grant" : "Restrict"}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.permissions}>
          {permissionKeys.map(([key, label]) => <PermissionChip key={key} label={label} checked={newKeys.includes(key)} onPress={() => togglePermission("new", key)} />)}
        </View>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: newInherit }} onPress={() => setNewInherit((value) => !value)} style={styles.inheritRow}>
          <View style={[styles.checkbox, newInherit ? styles.checked : null]}><Text style={styles.checkmark}>{newInherit ? "✓" : ""}</Text></View>
          <Text style={styles.helper}>Inherit to current and future subfolders</Text>
        </Pressable>
        <Pressable disabled={!availableFolders.length} onPress={addRule} style={[styles.secondary, !availableFolders.length ? styles.disabled : null]}>
          <Text style={styles.secondaryText}>Add rule</Text>
        </Pressable>
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable disabled={save.isPending} onPress={() => { setError(""); save.mutate(); }} style={styles.primary}>
        <Text style={styles.primaryText}>{save.isPending ? "Saving permissions…" : "Save all permissions"}</Text>
      </Pressable>
      <Text style={styles.helper}>Saving replaces this member’s permission rules as one server transaction.</Text>
      <Link href={{ pathname: "/(app)/workspace-member/[memberId]", params: { memberId: member.id, workspaceId: workspace.id } }} asChild>
        <Pressable><Text style={styles.back}>Back to member</Text></Pressable>
      </Link>
    </ScrollView>
  );
}

function PermissionChip({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={[styles.permissionChip, checked ? styles.permissionChecked : null]}>
      <Text style={[styles.permissionText, checked ? styles.selectedText : null]}>{label}</Text>
    </Pressable>
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

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36, gap: 12 },
  header: { gap: 5 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11 },
  notice: { backgroundColor: colors.greenWash, borderRadius: 14, padding: 13, gap: 5 },
  noticeTitle: { color: colors.greenDark, fontSize: 12, fontWeight: "800" },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 13, gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  rule: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 9 },
  ruleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  ruleCopy: { gap: 3 },
  folderName: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  effect: { color: colors.greenDark, fontSize: 10, fontWeight: "700" },
  restrict: { color: colors.red },
  removeRule: { borderWidth: 1, borderColor: colors.redWash, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  removeText: { color: colors.red, fontSize: 9, fontWeight: "800" },
  effectRow: { flexDirection: "row", gap: 7 },
  effectButton: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 9, alignItems: "center", paddingVertical: 8 },
  effectSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  effectButtonText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  effectSelectedText: { color: colors.greenDark },
  permissions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  permissionChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7 },
  permissionChecked: { borderColor: colors.green, backgroundColor: colors.greenWash },
  permissionText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  selectedText: { color: colors.greenDark, fontWeight: "800" },
  inheritRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  checked: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: colors.surface, fontSize: 11, fontWeight: "800" },
  folderChoice: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 9, padding: 10 },
  folderSelected: { borderColor: colors.green, backgroundColor: colors.greenWash },
  radio: { color: colors.greenDark, fontSize: 13 },
  secondary: { backgroundColor: colors.greenWash, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  secondaryText: { color: colors.greenDark, fontSize: 11, fontWeight: "800" },
  primary: { backgroundColor: colors.green, borderRadius: 11, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: colors.surface, fontSize: 12, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  error: { color: colors.red, fontSize: 12, lineHeight: 18 },
  state: { alignItems: "center", gap: 9, padding: 22 },
  back: { color: colors.greenDark, fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 8 },
});
