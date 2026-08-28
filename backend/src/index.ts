import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function main() {
  await connectDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`Inventory platform backend listening on port ${env.port}`);
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err instanceof Error ? err.message : err });
  process.exit(1);
});
