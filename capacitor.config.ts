import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shahil.gesturegarden',
  appName: 'Gesture Garden',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false,
    }
  }
};

export default config;
