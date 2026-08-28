import { Client, Environment } from 'square';
import { env } from '../../config/env';

// Targets the v38-era Square SDK client shape; verify against a newer major version if installed.
export function createSquareClient(accessToken: string): Client {
  return new Client({
    bearerAuthCredentials: { accessToken },
    environment: env.square.env === 'production' ? Environment.Production : Environment.Sandbox,
  });
}
