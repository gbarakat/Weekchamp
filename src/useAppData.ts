import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { dateKey, EMPTY_DATA, sanitize, type AppData } from './logic';

const STORAGE_KEY = 'weekchamp:data:v2';
// Release 1 data. Read once to migrate, never written or deleted, so it stays as a safety copy.
const LEGACY_KEY = 'weekchamp:data:v1';

/** App state persisted to device storage. `update` saves after every change. */
export function useAppData() {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      let raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) raw = await AsyncStorage.getItem(LEGACY_KEY);
      const parsed = raw ? sanitize(JSON.parse(raw)) : EMPTY_DATA;
      const firstUseAt = parsed.settings.firstUseAt ?? dateKey(new Date());
      setData({ ...parsed, settings: { ...parsed.settings, firstUseAt } });
    })()
      .catch(() => {
        // Unreadable or corrupt storage: start empty rather than crash.
      })
      .finally(() => {
        loadedRef.current = true;
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).then(
      () => setSaveError(false),
      () => setSaveError(true),
    );
  }, [data]);

  const update = useCallback((fn: (prev: AppData) => AppData) => setData(fn), []);

  return { data, update, loaded, saveError };
}
