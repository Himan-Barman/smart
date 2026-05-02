import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

const start = async (): Promise<void> => {
  await prisma.$connect();

  app.listen(env.PORT, env.HOST, () => {
    const displayHost = env.HOST === '0.0.0.0' ? 'localhost' : env.HOST;
    console.log(`Backend listening on http://${displayHost}:${env.PORT}`);

    if (env.SERVE_FRONTEND) {
      console.log(`Frontend served by backend at http://${displayHost}:${env.PORT}`);
    }
  });
};

void start();
