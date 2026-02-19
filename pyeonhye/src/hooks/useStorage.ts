import { useCallback, useEffect, useState } from 'react';
import { Storage } from '@apps-in-toss/web-framework';

export function useStorage(key: string) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const stored = await Storage.getItem(key);
        setValue(stored ?? '');
      } catch (error) {
        console.error('[Storage] failed to load value', error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [key]);

  const save = useCallback(
    async (newValue: string) => {
      try {
        await Storage.setItem(key, newValue);
        setValue(newValue);
      } catch (error) {
        console.error('[Storage] failed to save value', error);
      }
    },
    [key],
  );

  const remove = useCallback(async () => {
    try {
      await Storage.removeItem(key);
      setValue('');
    } catch (error) {
      console.error('[Storage] failed to remove value', error);
    }
  }, [key]);

  return { value, save, remove, loading };
}

export function useJsonStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const stored = await Storage.getItem(key);
        if (stored) {
          setValue(JSON.parse(stored));
        }
      } catch (error) {
        console.error('[Storage] failed to load JSON value', error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [key]);

  const save = useCallback(
    async (newValue: T) => {
      try {
        await Storage.setItem(key, JSON.stringify(newValue));
        setValue(newValue);
      } catch (error) {
        console.error('[Storage] failed to save JSON value', error);
      }
    },
    [key],
  );

  return { value, save, loading };
}
