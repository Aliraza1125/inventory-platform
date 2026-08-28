import { Client, Environment } from 'square';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { OAuthExchangeResult } from '../pos-provider.interface';

// Square OAuth helper, per developer.squareup.com/docs/oauth-api/overview. The practical
// local-dev path is SQUARE_ACCESS_TOKEN (see .env.example), which skips this flow entirely.
const SQUARE_OAUTH_BASE =
  env.square.env === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

const DEFAULT_SCOPES = ['MERCHANT_PROFILE_READ', 'ITEMS_READ', 'ITEMS_WRITE', 'INVENTORY_READ', 'INVENTORY_WRITE', 'ORDERS_READ'];

export function buildSquareAuthorizeUrl(state: string): string {
  if (!env.square.clientId || !env.square.redirectUri) {
    throw AppError.badRequest(
      'SQUARE_CLIENT_ID and SQUARE_REDIRECT_URI must be set to start OAuth.',
      'MISSING_CREDENTIALS',
    );
  }
  const params = new URLSearchParams({
    client_id: env.square.clientId,
    scope: DEFAULT_SCOPES.join(' '),
    session: 'false',
    state,
    redirect_uri: env.square.redirectUri,
  });
  return `${SQUARE_OAUTH_BASE}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeSquareCode(code: string): Promise<OAuthExchangeResult> {
  if (!env.square.clientId || !env.square.clientSecret) {
    throw AppError.badRequest('Square OAuth is not configured on this server.', 'MISSING_CREDENTIALS');
  }
  const client = new Client({
    environment: env.square.env === 'production' ? Environment.Production : Environment.Sandbox,
  });
  try {
    const response = await client.oAuthApi.obtainToken({
      clientId: env.square.clientId,
      clientSecret: env.square.clientSecret,
      code,
      grantType: 'authorization_code',
      redirectUri: env.square.redirectUri,
    });
    const result = response.result;
    return {
      accessToken: result.accessToken ?? '',
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt ? new Date(result.expiresAt) : undefined,
      merchantId: result.merchantId,
    };
  } catch (err) {
    throw AppError.badGateway('Failed to exchange Square authorization code.', 'SQUARE_OAUTH_ERROR', err);
  }
}
