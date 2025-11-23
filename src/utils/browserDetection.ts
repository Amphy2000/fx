export const detectBrowser = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = /chrome/.test(userAgent) && !/edg/.test(userAgent);
  const isEdge = /edg/.test(userAgent);
  const isFirefox = /firefox/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  
  return {
    isChrome,
    isEdge,
    isFirefox,
    isSafari,
    isIOS,
    isAndroid,
    supportsInstallPrompt: isChrome || isEdge,
    needsManualInstall: isFirefox || isSafari,
    browserName: isChrome ? 'Chrome' : isEdge ? 'Edge' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Unknown',
    platform: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'
  };
};

export const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches;
};
