import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

/** Strips credentials from a Mongo URI before it's ever logged (e.g. Atlas connection strings). */
function redactCredentials(uri: string): string {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:***@');
}

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  logger.info(`MongoDB connected: ${redactCredentials(env.mongodbUri)}`);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
