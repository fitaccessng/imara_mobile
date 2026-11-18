import * as SecureStore from "expo-secure-store";
import { Directory, File as LocalFile, Paths } from "expo-file-system";

import { getApiBaseUrl, getApiSessionStorageKey, sessionCookieName } from "@/config";
import type { PersonalFile } from "@/files/api";

export async function downloadPersonalFile(
  file: Pick<PersonalFile, "id" | "name" | "mimeType">,
  onProgress?: (written: number, total: number) => void,
): Promise<LocalFile> {
  return downloadAuthenticatedFile(
    `/files/${encodeURIComponent(file.id)}/download`,
    file,
    onProgress,
  );
}

export async function downloadAuthenticatedFile(
  path: string,
  file: Pick<PersonalFile, "id" | "name" | "mimeType">,
  onProgress?: (written: number, total: number) => void,
): Promise<LocalFile> {
  const session = await SecureStore.getItemAsync(getApiSessionStorageKey());
  if (!session) throw new Error("Your session has expired. Sign in again to download this file.");

  const directory = new Directory(Paths.document, "downloads");
  directory.create({ intermediates: true, idempotent: true });

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const destination = new LocalFile(directory, `${file.id}.${extension}`);
  return LocalFile.downloadFileAsync(
    `${getApiBaseUrl()}${path}`,
    destination,
    {
      headers: { Cookie: `${sessionCookieName}=${session}` },
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => onProgress?.(bytesWritten, totalBytes),
    },
  );
}
