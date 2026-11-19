import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EMPTY_DATA, sanitize, type AppData } from './logic';

const STORAGE_KEY = 'weekchamp:data:v1';

/** App state persisted to device storage. `update` saves after every change. */
export function useAppData() {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setData(sanitize(JSON.parse(raw)));
      })
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
