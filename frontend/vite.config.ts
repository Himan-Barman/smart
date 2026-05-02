import { defineConfig, loadEnv } from 'vite';

const toPort = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:4000';

  return {
    server: {
      host: env.VITE_DEV_HOST || '127.0.0.1',
      port: toPort(env.VITE_DEV_PORT, 5173),
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: env.VITE_PREVIEW_HOST || '127.0.0.1',
      port: toPort(env.VITE_PREVIEW_PORT, 4173),
    },
  };
});
