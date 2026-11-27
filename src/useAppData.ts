import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { dateKey, EMPTY_DATA, sanitize, type AppData } from './logic';

// Data saved by releases 1 and 2 lives under other keys. It is left untouched and is not used.
const STORAGE_KEY = 'weekchamp:data:v3';

async function load(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  let data = EMPTY_DATA;
  if (raw) {
    try {
      data = sanitize(JSON.parse(raw));
    } catch {
      // Unreadable JSON: start empty.
    }
  }
  return data.settings.firstUseAt
    ? data
    : { ...data, settings: { ...data.settings, firstUseAt: dateKey(new Date()) } };
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).then(
      () => setError(null),
      () => setError('save'),
    );
  }, [data]);

  const update = useCallback((fn: (prev: AppData) => AppData) => setData(fn), []);

  return { data, update, loaded, error };
}
