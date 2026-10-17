import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { listContacts } from '../lib/db';
import type { Contact } from '../lib/types';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => {
    setContacts(await listContacts());
    setLoaded(true);
  }, []);
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  return { contacts, loaded, reload };
}
