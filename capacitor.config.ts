import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ... your existing config
  server: {
    cleartext: true,
    allowNavigation: ['https://pdf-service.onrender.com']
  }
};

export default config;
