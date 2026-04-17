import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maahhha.formatforge',
  appName: 'FormatForge Pro',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: ['https://pdf-service.onrender.com']
  }
};

export default config;
