import { apiRequest } from "@/api/client";

export type ShareLink = {
  id: string;
  createdAt: string;
  revokedAt: string | null;
};

export type CreatedShareLink = {
  id: string;
  token: string;
  createdAt: string;
};

export type PersonalFolder = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  isFavorite: boolean;
};

export type PersonalFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: string;
  folderId: string | null;
  createdAt: string;
  isFavorite: boolean;
  expiresAt?: string | null;
  deletedAt?: string | null;
  folderName?: string | null;
};

export type PersonalFileListing = {
  folderId: string | null;
  folders: PersonalFolder[];
  files: PersonalFile[];
};

export type PersonalFileSearchResult = {
  query: string;
  folders: PersonalFolder[];
  files: PersonalFile[];
};

export type SmartFileCategory =
  | "FINANCE"
  | "CONTRACTS"
  | "HUMAN_RESOURCES"
  | "OPERATIONS"
  | "PERSONAL"
  | "OTHER";

export type SmartFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: string;
  updatedAt: string;
  category: SmartFileCategory;
  tags: string[];
  contentHash: string | null;
  folder: { id: string; name: string } | null;
};

export type DuplicateGroup = {
  contentHash: string;
  files: Array<Pick<SmartFile, "id" | "name" | "mimeType" | "sizeBytes" | "createdAt" | "contentHash">>;
};

export type WorkspaceFolder = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  permissions?: string[];
  inherited?: boolean;
};

export type WorkspaceFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: string;
  folderId: string | null;
  createdAt: string;
};

export type WorkspaceFileListing = {
  workspaceId: string;
  folderId: string | null;
  folders: WorkspaceFolder[];
  files: WorkspaceFile[];
};

export function getPersonalFiles(folderId: string | null): Promise<PersonalFileListing> {
  const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
  return apiRequest<PersonalFileListing>(`/files${query}`);
}

export function createPersonalFolder(name: string, parentFolderId: string | null): Promise<PersonalFolder> {
  return apiRequest<PersonalFolder>("/folders", {
    method: "POST",
    body: JSON.stringify({ name, parentFolderId }),
  });
}

export function setPersonalFileFavorite(fileId: string, isFavorite: boolean): Promise<unknown> {
  return apiRequest(`/files/${encodeURIComponent(fileId)}/favorite`, {
    method: "PATCH",
    body: JSON.stringify({ isFavorite }),
  });
}

export function movePersonalFileToTrash(fileId: string): Promise<void> {
  return apiRequest<void>(`/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}

export function uploadPersonalFile(file: Blob & { name: string }, folderId: string | null): Promise<PersonalFile> {
  const body = new FormData();
  body.append("file", file, file.name);
  if (folderId) body.append("folderId", folderId);
  return apiRequest<PersonalFile>("/files", { method: "POST", body });
}

export function getPersonalFileCollection(collection: "favorites" | "trash"): Promise<PersonalFile[]> {
  return apiRequest<PersonalFile[]>(collection === "favorites" ? "/files/favorites" : "/files/trash");
}

export function searchPersonalFiles(query: string): Promise<PersonalFileSearchResult> {
  return apiRequest<PersonalFileSearchResult>(`/search?q=${encodeURIComponent(query)}`);
}

export function restorePersonalFile(fileId: string): Promise<unknown> {
  return apiRequest(`/files/${encodeURIComponent(fileId)}/restore`, { method: "POST" });
}

export function permanentlyDeletePersonalFile(fileId: string): Promise<void> {
  return apiRequest<void>(`/files/${encodeURIComponent(fileId)}/permanent`, { method: "DELETE" });
}

export function getPersonalFolderTree(): Promise<PersonalFolder[]> {
  return apiRequest<PersonalFolder[]>("/folders/tree");
}

export function getPersonalFolderFavorites(): Promise<PersonalFolder[]> {
  return apiRequest<PersonalFolder[]>("/folders/favorites");
}

export function renamePersonalFolder(folderId: string, name: string): Promise<PersonalFolder> {
  return apiRequest<PersonalFolder>(`/folders/${encodeURIComponent(folderId)}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function movePersonalFolder(folderId: string, parentFolderId: string | null): Promise<PersonalFolder> {
  return apiRequest<PersonalFolder>(`/folders/${encodeURIComponent(folderId)}/move`, {
    method: "POST",
    body: JSON.stringify({ parentFolderId }),
  });
}

export function setPersonalFolderFavorite(folderId: string, isFavorite: boolean): Promise<unknown> {
  return apiRequest(`/folders/${encodeURIComponent(folderId)}/favorite`, {
    method: "PATCH",
    body: JSON.stringify({ isFavorite }),
  });
}

export function deletePersonalFolder(folderId: string): Promise<void> {
  return apiRequest<void>(`/folders/${encodeURIComponent(folderId)}`, { method: "DELETE" });
}

function personalSharePath(fileId: string): string {
  return `/files/${encodeURIComponent(fileId)}/shares`;
}

export function getPersonalFileShares(fileId: string): Promise<ShareLink[]> {
  return apiRequest<ShareLink[]>(personalSharePath(fileId));
}

export function createPersonalFileShare(fileId: string): Promise<CreatedShareLink> {
  return apiRequest<CreatedShareLink>(personalSharePath(fileId), { method: "POST" });
}

export function revokePersonalFileShare(fileId: string, shareId: string): Promise<void> {
  return apiRequest<void>(`${personalSharePath(fileId)}/${encodeURIComponent(shareId)}`, { method: "DELETE" });
}

export function getSmartLibrary(): Promise<SmartFile[]> {
  return apiRequest<SmartFile[]>("/files/smart-library");
}

export function getDuplicateFiles(): Promise<DuplicateGroup[]> {
  return apiRequest<DuplicateGroup[]>("/files/duplicates");
}

export function updatePersonalFileOrganization(
  fileId: string,
  changes: { category?: SmartFileCategory; tags?: string[] },
): Promise<{ id: string; category: SmartFileCategory; tags: string[] }> {
  return apiRequest(`/files/${encodeURIComponent(fileId)}/organization`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

function workspacePath(workspaceId: string, suffix: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/${suffix}`;
}

export function getWorkspaceFileListing(workspaceId: string, folderId: string | null): Promise<WorkspaceFileListing> {
  const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
  return apiRequest<WorkspaceFileListing>(`${workspacePath(workspaceId, "storage")}${query}`);
}

export function getWorkspaceFolders(workspaceId: string): Promise<WorkspaceFolder[]> {
  return apiRequest<WorkspaceFolder[]>(workspacePath(workspaceId, "my-folders"));
}

export function createWorkspaceFolder(
  workspaceId: string,
  name: string,
  parentFolderId: string | null,
): Promise<WorkspaceFolder> {
  return apiRequest<WorkspaceFolder>(workspacePath(workspaceId, "folders"), {
    method: "POST",
    body: JSON.stringify({ name, ...(parentFolderId ? { parentFolderId } : {}) }),
  });
}

export function uploadWorkspaceFile(
  workspaceId: string,
  file: Blob & { name: string },
  folderId: string | null,
): Promise<WorkspaceFile> {
  const body = new FormData();
  body.append("file", file, file.name);
  if (folderId) body.append("folderId", folderId);
  return apiRequest<WorkspaceFile>(workspacePath(workspaceId, "files"), { method: "POST", body });
}

export function renameWorkspaceFolder(workspaceId: string, folderId: string, name: string): Promise<WorkspaceFolder> {
  return apiRequest<WorkspaceFolder>(workspacePath(workspaceId, `folders/${encodeURIComponent(folderId)}`), {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteWorkspaceFolder(workspaceId: string, folderId: string): Promise<void> {
  return apiRequest<void>(workspacePath(workspaceId, `folders/${encodeURIComponent(folderId)}`), { method: "DELETE" });
}

export function renameWorkspaceFile(workspaceId: string, fileId: string, name: string): Promise<WorkspaceFile> {
  return apiRequest<WorkspaceFile>(workspacePath(workspaceId, `files/${encodeURIComponent(fileId)}`), {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function moveWorkspaceFile(workspaceId: string, fileId: string, folderId: string | null): Promise<{ id: string; folderId: string | null }> {
  return apiRequest(workspacePath(workspaceId, `files/${encodeURIComponent(fileId)}/move`), {
    method: "POST",
    body: JSON.stringify({ folderId }),
  });
}

export function deleteWorkspaceFile(workspaceId: string, fileId: string): Promise<void> {
  return apiRequest<void>(workspacePath(workspaceId, `files/${encodeURIComponent(fileId)}`), { method: "DELETE" });
}

function workspaceSharePath(workspaceId: string, fileId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/files/${encodeURIComponent(fileId)}/shares`;
}

export function getWorkspaceFileShares(workspaceId: string, fileId: string): Promise<ShareLink[]> {
  return apiRequest<ShareLink[]>(workspaceSharePath(workspaceId, fileId));
}

export function createWorkspaceFileShare(workspaceId: string, fileId: string): Promise<CreatedShareLink> {
  return apiRequest<CreatedShareLink>(workspaceSharePath(workspaceId, fileId), { method: "POST" });
}

export function revokeWorkspaceFileShare(workspaceId: string, fileId: string, shareId: string): Promise<void> {
  return apiRequest<void>(`${workspaceSharePath(workspaceId, fileId)}/${encodeURIComponent(shareId)}`, { method: "DELETE" });
}
