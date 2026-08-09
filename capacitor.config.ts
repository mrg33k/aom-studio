import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aheadofmarket.corner',
  appName: 'Corner',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
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
