import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moriki.sms',
  appName: 'Moriki SMS',
  webDir: 'out',
  server: {
    url: 'https://morikisms.com',
    cleartext: false
  }
};

export default config;
