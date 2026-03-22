import { useCallback, useEffect, useState } from 'react';
import Constants from 'expo-constants';

import { auth } from '@/constants/firebase';

export type UserRank = 'alpha' | 'beta' | 'sigma';

function parseRank(value: unknown): UserRank {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'alpha' || normalized === 'sigma') return normalized;
  return 'beta';
}

function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:5001`;

  return 'http://127.0.0.1:5001';
}

export function useUserRank() {
  const [rank, setRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshRank = useCallback(async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/rank`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json().catch(() => ({}));
      setRank(parseRank(payload?.rank));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRank();
  }, [refreshRank]);

  return { rank, loading, refreshRank };
}
