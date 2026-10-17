import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { getSyncState, loadCards, subscribeSync } from '../lib/sync';
import type { Contact } from '../lib/types';

/** The cards list: the server's, plus anything on this phone not uploaded yet. */
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const r = await loadCards();
    setContacts(r.cards);
    setError(r.error);
    setLoaded(true);
    return r.error;
  }, []);
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  // an upload just finished: the server's list now has it
  useEffect(() => {
    let busy = getSyncState().busy;
    return subscribeSync(() => {
      const now = getSyncState().busy;
      if (busy && !now) reload();
      busy = now;
    });
  }, [reload]);
  return { contacts, loaded, error, reload };
}
