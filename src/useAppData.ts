import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { dateKey, EMPTY_DATA, normalize, type AppData } from './logic';

const KEY_V2 = 'weekchamp:data:v2';
const KEY_V1 = 'weekchamp:data:v1'; // read once for migration, never written or removed

function parse(raw: string | null): AppData | null {
  if (!raw) return null;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Reads v2 data, or migrates v1 data if v2 is absent or unreadable. */
async function load(): Promise<AppData> {
  const data =
    parse(await AsyncStorage.getItem(KEY_V2)) ??
    parse(await AsyncStorage.getItem(KEY_V1)) ??
    EMPTY_DATA;
  return data.settings.firstLaunchAt
    ? data
    : { ...data, settings: { ...data.settings, firstLaunchAt: dateKey(new Date()) } };
}

export type StorageError = 'load' | 'save' | null;

/** App state persisted to device storage. `update` saves after every change. */
export function useAppData() {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<StorageError>(null);
  const canSave = useRef(false);

  useEffect(() => {
    load().then(
      (loadedData) => {
        setData(loadedData);
        canSave.current = true;
        setLoaded(true);
      },
      () => {
        // Storage could not be read. Do not save, so whatever is stored is not overwritten.
        setError('load');
        setLoaded(true);
      },
    );
  }, []);

  useEffect(() => {
    if (!canSave.current) return;
    AsyncStorage.setItem(KEY_V2, JSON.stringify(data)).then(
      () => setError(null),
      () => setError('save'),
    );
  }, [data]);

  const update = useCallback((fn: (prev: AppData) => AppData) => setData(fn), []);

  return { data, update, loaded, error };
}
