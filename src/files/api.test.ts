import { apiRequest } from "@/api/client";
import {
  createPersonalFolder,
  createPersonalFileShare,
  deletePersonalFolder,
  getPersonalFileCollection,
  getPersonalFileShares,
  getPersonalFolderFavorites,
  getPersonalFolderTree,
  getPersonalFiles,
  getDuplicateFiles,
  getSmartLibrary,
  movePersonalFolder,
  movePersonalFileToTrash,
  permanentlyDeletePersonalFile,
  renamePersonalFolder,
  revokePersonalFileShare,
  restorePersonalFile,
  searchPersonalFiles,
  setPersonalFileFavorite,
  setPersonalFolderFavorite,
  updatePersonalFileOrganization,
  uploadPersonalFile,
  createWorkspaceFolder,
  createWorkspaceFileShare,
  deleteWorkspaceFile,
  deleteWorkspaceFolder,
  getWorkspaceFileListing,
  getWorkspaceFileShares,
  getWorkspaceFolders,
  moveWorkspaceFile,
  renameWorkspaceFile,
  renameWorkspaceFolder,
  revokeWorkspaceFileShare,
  uploadWorkspaceFile,
} from "@/files/api";

jest.mock("@/api/client", () => ({
  apiRequest: jest.fn(),
}));

const request = jest.mocked(apiRequest);

describe("personal files API", () => {
  beforeEach(() => {
    request.mockResolvedValue({} as never);
  });

  it("uses the existing personal file and folder routes", async () => {
    await getPersonalFiles(null);
    await getPersonalFiles("folder/id");
    await createPersonalFolder("Reports", "folder/id");
    await setPersonalFileFavorite("file/id", true);
    await movePersonalFileToTrash("file/id");

    expect(request).toHaveBeenNthCalledWith(1, "/files");
    expect(request).toHaveBeenNthCalledWith(2, "/files?folderId=folder%2Fid");
    expect(request).toHaveBeenNthCalledWith(3, "/folders", {
      method: "POST",
      body: JSON.stringify({ name: "Reports", parentFolderId: "folder/id" }),
    });
    expect(request).toHaveBeenNthCalledWith(4, "/files/file%2Fid/favorite", {
      method: "PATCH",
      body: JSON.stringify({ isFavorite: true }),
    });
    expect(request).toHaveBeenNthCalledWith(5, "/files/file%2Fid", { method: "DELETE" });
  });

  it("uses existing search, favourites, trash, and restore endpoints", async () => {
    await searchPersonalFiles("board minutes");
    await getPersonalFileCollection("favorites");
    await getPersonalFileCollection("trash");
    await restorePersonalFile("file/id");
    await permanentlyDeletePersonalFile("file/id");

    expect(request).toHaveBeenNthCalledWith(1, "/search?q=board%20minutes");
    expect(request).toHaveBeenNthCalledWith(2, "/files/favorites");
    expect(request).toHaveBeenNthCalledWith(3, "/files/trash");
    expect(request).toHaveBeenNthCalledWith(4, "/files/file%2Fid/restore", { method: "POST" });
    expect(request).toHaveBeenNthCalledWith(5, "/files/file%2Fid/permanent", { method: "DELETE" });
  });

  it("uploads a selected file to its current folder", async () => {
    const file = new Blob(["document"], { type: "text/plain" }) as Blob & { name: string };
    Object.defineProperty(file, "name", { value: "notes.txt" });

    await uploadPersonalFile(file, "folder-id");

    const [path, options] = request.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/files");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get("folderId")).toBe("folder-id");
    expect((options.body as FormData).get("file")).toMatchObject({
      name: "notes.txt",
      type: "text/plain",
      size: 8,
    });
  });

  it("uses the current folder management and share-link contracts", async () => {
      await getPersonalFolderTree();
      await getPersonalFolderFavorites();
      await renamePersonalFolder("folder/id", "Renamed");
      await movePersonalFolder("folder/id", null);
      await setPersonalFolderFavorite("folder/id", true);
      await deletePersonalFolder("folder/id");
      await getPersonalFileShares("file/id");
      await createPersonalFileShare("file/id");
      await revokePersonalFileShare("file/id", "share/id");

      expect(request).toHaveBeenNthCalledWith(1, "/folders/tree");
      expect(request).toHaveBeenNthCalledWith(2, "/folders/favorites");
      expect(request).toHaveBeenNthCalledWith(3, "/folders/folder%2Fid", {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed" }),
      });
      expect(request).toHaveBeenNthCalledWith(4, "/folders/folder%2Fid/move", {
        method: "POST",
        body: JSON.stringify({ parentFolderId: null }),
      });
      expect(request).toHaveBeenNthCalledWith(5, "/folders/folder%2Fid/favorite", {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: true }),
      });
      expect(request).toHaveBeenNthCalledWith(6, "/folders/folder%2Fid", { method: "DELETE" });
      expect(request).toHaveBeenNthCalledWith(7, "/files/file%2Fid/shares");
      expect(request).toHaveBeenNthCalledWith(8, "/files/file%2Fid/shares", { method: "POST" });
      expect(request).toHaveBeenNthCalledWith(9, "/files/file%2Fid/shares/share%2Fid", { method: "DELETE" });
  });

  it("uses the current smart library organization and duplicate routes", async () => {
      await getSmartLibrary();
      await getDuplicateFiles();
      await updatePersonalFileOrganization("file/id", { category: "FINANCE", tags: ["quarterly"] });

      expect(request).toHaveBeenNthCalledWith(1, "/files/smart-library");
      expect(request).toHaveBeenNthCalledWith(2, "/files/duplicates");
      expect(request).toHaveBeenNthCalledWith(3, "/files/file%2Fid/organization", {
        method: "PATCH",
        body: JSON.stringify({ category: "FINANCE", tags: ["quarterly"] }),
    });
  });

  it("uses the existing workspace storage, folder, and file action contracts", async () => {
    const file = new Blob(["workspace document"], { type: "text/plain" }) as Blob & { name: string };
    Object.defineProperty(file, "name", { value: "shared.txt" });

    await getWorkspaceFileListing("workspace/id", "folder/id");
    await getWorkspaceFolders("workspace/id");
    await createWorkspaceFolder("workspace/id", "Reports", "folder/id");
    await uploadWorkspaceFile("workspace/id", file, "folder/id");
    await renameWorkspaceFile("workspace/id", "file/id", "renamed.txt");
    await moveWorkspaceFile("workspace/id", "file/id", "destination/id");
    await deleteWorkspaceFile("workspace/id", "file/id");
    await renameWorkspaceFolder("workspace/id", "folder/id", "Renamed");
    await deleteWorkspaceFolder("workspace/id", "folder/id");
    await getWorkspaceFileShares("workspace/id", "file/id");
    await createWorkspaceFileShare("workspace/id", "file/id");
    await revokeWorkspaceFileShare("workspace/id", "file/id", "share/id");

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces/workspace%2Fid/storage?folderId=folder%2Fid");
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/my-folders");
    expect(request).toHaveBeenNthCalledWith(3, "/workspaces/workspace%2Fid/folders", {
      method: "POST",
      body: JSON.stringify({ name: "Reports", parentFolderId: "folder/id" }),
    });

    const [uploadPath, uploadOptions] = request.mock.calls[3] as [string, RequestInit];
    expect(uploadPath).toBe("/workspaces/workspace%2Fid/files");
    expect(uploadOptions.method).toBe("POST");
    expect(uploadOptions.body).toBeInstanceOf(FormData);
    expect((uploadOptions.body as FormData).get("folderId")).toBe("folder/id");
    expect((uploadOptions.body as FormData).get("file")).toMatchObject({ name: "shared.txt", size: 18 });

    expect(request).toHaveBeenNthCalledWith(5, "/workspaces/workspace%2Fid/files/file%2Fid", {
      method: "PATCH",
      body: JSON.stringify({ name: "renamed.txt" }),
    });
    expect(request).toHaveBeenNthCalledWith(6, "/workspaces/workspace%2Fid/files/file%2Fid/move", {
      method: "POST",
      body: JSON.stringify({ folderId: "destination/id" }),
    });
    expect(request).toHaveBeenNthCalledWith(7, "/workspaces/workspace%2Fid/files/file%2Fid", { method: "DELETE" });
    expect(request).toHaveBeenNthCalledWith(8, "/workspaces/workspace%2Fid/folders/folder%2Fid", {
      method: "PATCH",
      body: JSON.stringify({ name: "Renamed" }),
    });
    expect(request).toHaveBeenNthCalledWith(9, "/workspaces/workspace%2Fid/folders/folder%2Fid", { method: "DELETE" });
    expect(request).toHaveBeenNthCalledWith(10, "/workspaces/workspace%2Fid/files/file%2Fid/shares");
    expect(request).toHaveBeenNthCalledWith(11, "/workspaces/workspace%2Fid/files/file%2Fid/shares", { method: "POST" });
    expect(request).toHaveBeenNthCalledWith(12, "/workspaces/workspace%2Fid/files/file%2Fid/shares/share%2Fid", { method: "DELETE" });
  });
});
