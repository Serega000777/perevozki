import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Единый .env лежит в корне репозитория; переменные процесса (Docker build args) важнее.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '');
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.API_URL || '/api'),
      'import.meta.env.VITE_BOT_URL': JSON.stringify(env.BOT_URL || 'https://t.me/perevozki_bot_bot'),
    },
    server: { host: true, port: 5180, strictPort: true, proxy: { '/api': `http://localhost:${env.PORT || 3010}` } },
  };
});
