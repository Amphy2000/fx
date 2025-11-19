// Get the existing service worker registration (from VitePWA)
export async function registerPushServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[Push SW] Service Worker not supported');
    return null;
  }

  try {
    // Wait for the VitePWA service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    
    console.log('[Push SW] Using existing SW registration:', registration);
    
    return registration;
  } catch (error) {
    console.error('[Push SW] Failed to get SW registration:', error);
    return null;
  }
}
