import { useEffect } from 'react';
import { syncOfflineData } from '@/utils/syncService';
import { initOfflineDB } from '@/utils/offlineStorage';

export const useOfflineSync = () => {
  useEffect(() => {
    // Initialize offline DB on mount
    initOfflineDB();

    // Sync on mount if online
    if (navigator.onLine) {
      syncOfflineData();
    }

    // Set up periodic sync every 5 minutes
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncOfflineData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, []);
};
