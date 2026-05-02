export function buildGeolocationScript(lat: number, lng: number): string {
  return `(function() {
    try {
      const fakePos = {
        coords: { latitude: ${lat}, longitude: ${lng}, accuracy: 15, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: Date.now()
      };
      navigator.geolocation.getCurrentPosition = function(s) { s(fakePos); };
      navigator.geolocation.watchPosition = function(s) { s(fakePos); return 1; };
    } catch(e) {}
  })(); true;`;
}

export function buildTimezoneScript(timezone: string): string {
  return `(function() {
    try {
      const _DTF = Intl.DateTimeFormat;
      function PatchedDTF(locale, opts) {
        opts = Object.assign({}, opts, { timeZone: '${timezone}' });
        return new _DTF(locale, opts);
      }
      PatchedDTF.supportedLocalesOf = _DTF.supportedLocalesOf;
      Intl.DateTimeFormat = PatchedDTF;
    } catch(e) {}
  })(); true;`;
}

export function buildLanguageScript(lang: string): string {
  return `(function() {
    try {
      Object.defineProperty(navigator, 'language', { get: () => '${lang}' });
      Object.defineProperty(navigator, 'languages', { get: () => ['${lang}', '${lang.split('-')[0]}'] });
    } catch(e) {}
  })(); true;`;
}

export function buildUserAgentScript(ua: string): string {
  return `(function() {
    try {
      Object.defineProperty(navigator, 'userAgent', { get: () => '${ua.replace(/'/g, "\\'")}' });
    } catch(e) {}
  })(); true;`;
}

export function buildHardwareScript(): string {
  return `(function() {
    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
      Object.defineProperty(screen, 'width', { get: () => 1920 });
      Object.defineProperty(screen, 'height', { get: () => 1080 });
    } catch(e) {}
  })(); true;`;
}

export function buildWebRTCLeakPreventScript(): string {
  return `(function() {
    try {
      const _RTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function(config) {
        if (config && config.iceServers) config.iceServers = [];
        return new _RTCPeerConnection(config);
      };
    } catch(e) {}
  })(); true;`;
}

export const ADBLOCK_SCRIPT = `(function() {
  const style = document.createElement('style');
  style.textContent = '[id*="google_ads"],[class*="google-ad"],[id*="ad-container"],[class*="ad-container"],[class*="advertisement"],[id*="advertisement"],.sponsored,[class*="sponsored"],[data-ad],[data-ads],.banner-ad,.ad-banner,#ads,.ads,.adsbygoogle{display:none!important}';
  document.head.appendChild(style);
  const obs = new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.src&&/doubleclick|googlesyndication|adnxs|amazon-adsystem|googleadservices|moatads/.test(n.src)){n.parentNode&&n.parentNode.removeChild(n)}})})});
  if(document.body) obs.observe(document.body,{childList:true,subtree:true});
})(); true;`;
