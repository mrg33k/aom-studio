import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aheadofmarket.corner',
  appName: 'Corner',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    // CV6 is full-bleed (`viewport-fit=cover`) and owns safe-area spacing in CSS.
    // UIKit adjustment here double-reserves the home-indicator inset and clips
    // the native two-row chat composer above a black bottom strip.
    contentInset: 'never',
    preferredContentMode: 'mobile',
    backgroundColor: '#0A0A0B',
  },
  plugins: {
    // Dashboard APIs require a bearer token. Native transport avoids WebKit's
    // CORS preflight boundary while preserving the standard fetch/XHR surface.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
