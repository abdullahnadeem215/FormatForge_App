import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maahhha.formatforge',
  appName: 'FormatForge Pro',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: ['http://localhost:8080']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,  // Set to 0 to disable
      launchAutoHide: true,
      showSpinner: false
    }
  }
};

export default config;
