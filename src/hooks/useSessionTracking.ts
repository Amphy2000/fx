import { useEffect } from 'react';

export const useSessionTracking = () => {
  useEffect(() => {
    // Track session count for PWA install prompt
    const sessionCount = parseInt(localStorage.getItem('sessionCount') || '0');
    localStorage.setItem('sessionCount', String(sessionCount + 1));
    
    // Track last visit
    localStorage.setItem('lastVisit', new Date().toISOString());
  }, []);
};