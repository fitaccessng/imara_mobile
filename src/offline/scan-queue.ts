import * as SQLite from "expo-sqlite";
import { Directory, File, Paths } from "expo-file-system";

export interface PendingScan {
  id: number;
  userId: string;
  uri: string;
  fileName: string;
  createdAt: string;
}

const database = SQLite.openDatabaseAsync("imara-mobile.db");
const scanDirectory = new Directory(Paths.document, "pending-scans");

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await database;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pending_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      uri TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

export async function savePendingScan(sourceUri: string, userId: string): Promise<PendingScan> {
  if (!scanDirectory.exists) scanDirectory.create({ intermediates: true });
  const fileName = `scan-${Date.now()}.jpg`;
  const savedFile = new File(scanDirectory, fileName);
  await new File(sourceUri).copy(savedFile);

  const createdAt = new Date().toISOString();
  const db = await getDatabase();
  let result: SQLite.SQLiteRunResult;
  try {
    result = await db.runAsync(
      "INSERT INTO pending_scans (user_id, uri, file_name, created_at) VALUES (?, ?, ?, ?)",
      userId,
      savedFile.uri,
      fileName,
      createdAt,
    );
  } catch (error) {
    savedFile.delete();
    throw error;
  }
  return {
    id: result.lastInsertRowId,
    userId,
    uri: savedFile.uri,
    fileName,
    createdAt,
  };
}

export async function listPendingScans(userId: string): Promise<PendingScan[]> {
  const db = await getDatabase();
  return db.getAllAsync<PendingScan>(
    "SELECT id, user_id AS userId, uri, file_name AS fileName, created_at AS createdAt FROM pending_scans WHERE user_id = ? ORDER BY created_at ASC",
    userId,
  );
}

export async function removePendingScan(scan: PendingScan): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM pending_scans WHERE id = ?", scan.id);
  const file = new File(scan.uri);
  if (file.exists) file.delete();
}

export async function removePendingScansForUser(userId: string): Promise<void> {
  const scans = await listPendingScans(userId);
  for (const scan of scans) {
    await removePendingScan(scan);
  }
}
