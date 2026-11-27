// Pure backup file format (F07). No Expo imports: unit-tested.

import { sanitize, type AppData } from './logic.ts';

export type BackupFile = {
  app: 'weekchamp';
  schemaVersion: 2;
  exportedAt: string; // ISO time
  data: AppData;
};

export function backupFileName(today: string): string {
  return `weekchamp-backup-${today}.json`;
}

export function makeBackup(data: AppData, exportedAt: string): string {
  const file: BackupFile = { app: 'weekchamp', schemaVersion: 2, exportedAt, data };
  return JSON.stringify(file, null, 2);
}

export type ParsedBackup =
  | { ok: true; data: AppData; exportedAt: string | null }
  | { ok: false; reason: string };

const NOT_A_BACKUP = "This file isn't a Weekchamp backup.";

/** Validate an imported file. Accepts v1- and v2-shaped data inside. Never throws. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: NOT_A_BACKUP };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, reason: NOT_A_BACKUP };
  const r = raw as Record<string, unknown>;
  if (r.app !== 'weekchamp' || !r.data || typeof r.data !== 'object') {
    return { ok: false, reason: NOT_A_BACKUP };
  }
  if (typeof r.schemaVersion === 'number' && r.schemaVersion > 2) {
    return { ok: false, reason: 'This backup is from a newer version of the app. Update the app first.' };
  }
  const data = sanitize(r.data);
  return { ok: true, data, exportedAt: typeof r.exportedAt === 'string' ? r.exportedAt : null };
}
