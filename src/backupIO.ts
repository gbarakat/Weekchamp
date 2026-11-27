// Thin wrapper for exporting/importing backup files. The format lives in backup.ts.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { backupFileName, makeBackup, parseBackup, type ParsedBackup } from './backup';
import type { AppData } from './logic';

/** Write a backup file and open the share sheet. Resolves true once the sheet was shown. */
export async function exportBackup(data: AppData, today: string): Promise<boolean> {
  const file = new File(Paths.cache, backupFileName(today));
  if (file.exists) file.delete();
  file.create();
  await file.write(makeBackup(data, new Date().toISOString()));
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your Weekchamp backup',
  });
  return true;
}

/** Let the user pick a backup file. Null when they cancel. */
export async function pickBackup(): Promise<ParsedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  try {
    const text = await new File(result.assets[0].uri).text();
    return parseBackup(text);
  } catch {
    return { ok: false, reason: "This file couldn't be read." };
  }
}
