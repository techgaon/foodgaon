import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __BUILD_MS__: JSON.stringify(Date.now()),
    // same number as the APK / release (GitHub Actions run number); local builds show "dev"
    __APP_VERSION__: JSON.stringify(process.env.VERSION_NAME || (process.env.GITHUB_RUN_NUMBER ? `1.0.${process.env.GITHUB_RUN_NUMBER}` : 'dev')),
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
