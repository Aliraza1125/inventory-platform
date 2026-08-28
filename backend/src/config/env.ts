import dotenv from 'dotenv';

dotenv.config();

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(optional('PORT', '4000')),
  nodeEnv: optional('NODE_ENV', 'development'),
  frontendOrigin: optional('FRONTEND_ORIGIN', 'http://localhost:3000'),

  mongodbUri: optional('MONGODB_URI', 'mongodb://127.0.0.1:27017/inventory_platform'),

  square: {
    env: optional('SQUARE_ENV', 'sandbox'),
    accessToken: optional('SQUARE_ACCESS_TOKEN'),
    // Optional: pin a specific location instead of auto-picking the first from listLocations().
    locationId: optional('SQUARE_LOCATION_ID'),
    clientId: optional('SQUARE_CLIENT_ID'),
    clientSecret: optional('SQUARE_CLIENT_SECRET'),
    redirectUri: optional('SQUARE_REDIRECT_URI'),
    webhookSignatureKey: optional('SQUARE_WEBHOOK_SIGNATURE_KEY'),
    webhookNotificationUrl: optional('SQUARE_WEBHOOK_NOTIFICATION_URL'),
  },

  toast: {
    // "mock" uses MockToastProvider; "live" attempts the real (unverified) ToastProvider.
    mode: optional('TOAST_MODE', 'mock') as 'mock' | 'live',
    clientId: optional('TOAST_CLIENT_ID'),
    clientSecret: optional('TOAST_CLIENT_SECRET'),
    accessToken: optional('TOAST_ACCESS_TOKEN'),
    restaurantGuid: optional('TOAST_RESTAURANT_GUID'),
    webhookSecret: optional('TOAST_WEBHOOK_SECRET'),
  },
};

/** Square only truly "works" once an access token exists (sandbox token or completed OAuth). */
export const isSquareConfigured = (): boolean => Boolean(env.square.accessToken);

export const isToastLive = (): boolean =>
  env.toast.mode === 'live' && Boolean(env.toast.accessToken && env.toast.restaurantGuid);
