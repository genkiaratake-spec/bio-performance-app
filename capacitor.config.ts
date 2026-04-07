import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bioperflab.app',
  appName: 'Bio-Performance Lab',
  webDir: 'client/dist',
  server: {
    url: 'https://bio-performance-app.vercel.app',
    cleartext: false,
  },
};

export default config;
