// File plumbing for backups. What goes in the file, and validating it, lives in logic.ts.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Writes the backup and hands it to the share sheet (a download on web). */
export async function shareBackupFile(name: string, json: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(json);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save Weekchamp backup',
  });
}

/** Lets the user pick a file and returns its text, or null if they cancelled. */
export async function pickBackupText(): Promise<string | null> {
  // Any type: Android often reports .json files under a generic type and would grey them out.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (Platform.OS === 'web') return asset.file ? await asset.file.text() : null;
  return await new File(asset.uri).text();
}
