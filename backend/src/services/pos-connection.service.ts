import crypto from 'crypto';
import { POSProviderName } from '../models/POSConnection';
import { posConnectionRepository } from '../repositories/posConnection.repository';
import { ProviderFactory } from '../providers/provider.factory';
import { buildSquareAuthorizeUrl, exchangeSquareCode } from '../providers/square/square.oauth';
import { env, isSquareConfigured, isToastLive } from '../config/env';
import { AppError } from '../utils/AppError';

export const posConnectionService = {
  async listConnections() {
    const connections = await posConnectionRepository.findAll();
    // Always report both providers, even if never connected, so the UI can render both cards.
    const byProvider = new Map(connections.map((c) => [c.provider, c]));
    const providers: POSProviderName[] = ['square', 'toast'];
    return providers.map((provider) => {
      const existing = byProvider.get(provider);
      return {
        provider,
        mode: existing?.mode ?? ProviderFactory.modeFor(provider),
        status: existing?.status ?? 'disconnected',
        merchantId: existing?.merchantId,
        locationId: existing?.locationId,
        locationName: existing?.locationName,
        updatedAt: existing?.updatedAt,
      };
    });
  },

  // Connects immediately if a sandbox token is configured; otherwise use the OAuth endpoints.
  async connectSquare() {
    if (!isSquareConfigured()) {
      throw AppError.badRequest(
        'No SQUARE_ACCESS_TOKEN configured. Set one in backend/.env for local dev, or use the OAuth flow (/api/pos/square/oauth/authorize).',
        'MISSING_CREDENTIALS',
      );
    }
    const provider = ProviderFactory.get('square');
    const { merchantId, locationId: autoDetectedLocationId } = await provider.connect({
      connectionId: 'pending',
      accessToken: env.square.accessToken,
    });

    const locations = await provider.getLocations({ connectionId: 'pending', accessToken: env.square.accessToken });

    // SQUARE_LOCATION_ID, if set, must match a real location — fail fast rather than silently
    // fall back, since a mismatch is almost always a copy-paste error.
    let locationId = autoDetectedLocationId;
    if (env.square.locationId) {
      const match = locations.find((l) => l.id === env.square.locationId);
      if (!match) {
        throw AppError.badRequest(
          `SQUARE_LOCATION_ID "${env.square.locationId}" doesn't match any location for this Square account. ` +
            `Available: ${locations.map((l) => `${l.id} (${l.name})`).join(', ') || 'none'}.`,
          'INVALID_LOCATION_ID',
        );
      }
      locationId = match.id;
    }
    const locationName = locations.find((l) => l.id === locationId)?.name;

    return posConnectionRepository.upsertConnected('square', {
      mode: 'live',
      merchantId,
      locationId,
      locationName,
      accessToken: env.square.accessToken,
    });
  },

  startSquareOAuth() {
    const state = crypto.randomUUID();
    return { authorizeUrl: buildSquareAuthorizeUrl(state), state };
  },

  async completeSquareOAuth(code: string) {
    const result = await exchangeSquareCode(code);
    const provider = ProviderFactory.get('square');
    const { merchantId, locationId } = await provider.connect({
      connectionId: 'pending',
      accessToken: result.accessToken,
    });
    return posConnectionRepository.upsertConnected('square', {
      mode: 'live',
      merchantId: merchantId ?? result.merchantId,
      locationId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    });
  },

  /** Toast: connects in mock mode unless TOAST_MODE=live with credentials is configured. */
  async connectToast() {
    const live = isToastLive();
    const provider = ProviderFactory.get('toast');
    const ctx = { connectionId: crypto.randomUUID(), locationId: live ? env.toast.restaurantGuid : undefined };
    const { merchantId, locationId } = await provider.connect(ctx);
    const locations = await provider.getLocations(ctx);
    return posConnectionRepository.upsertConnected('toast', {
      mode: live ? 'live' : 'mock',
      merchantId,
      locationId: locationId ?? locations[0]?.id,
      locationName: locations[0]?.name,
    });
  },

  async disconnect(provider: POSProviderName) {
    const connection = await posConnectionRepository.findByProviderWithSecrets(provider);
    if (connection && connection.status === 'connected') {
      const posProvider = ProviderFactory.get(provider);
      await posProvider.disconnect({
        connectionId: String(connection._id),
        accessToken: connection.accessToken,
        locationId: connection.locationId,
      });
    }
    const updated = await posConnectionRepository.markDisconnected(provider);
    if (!updated) {
      throw AppError.notFound(`No connection found for ${provider}.`, 'CONNECTION_NOT_FOUND');
    }
    return updated;
  },

  async getProducts(provider: POSProviderName) {
    const connection = await posConnectionRepository.findByProviderWithSecrets(provider);
    if (!connection || connection.status !== 'connected') {
      throw AppError.badRequest(`${provider} is not connected.`, 'POS_NOT_CONNECTED');
    }
    const posProvider = ProviderFactory.get(provider);
    return posProvider.getProducts({
      connectionId: String(connection._id),
      accessToken: connection.accessToken,
      locationId: connection.locationId,
    });
  },

  async getLocations(provider: POSProviderName) {
    const connection = await posConnectionRepository.findByProviderWithSecrets(provider);
    const posProvider = ProviderFactory.get(provider);
    return posProvider.getLocations({
      connectionId: connection ? String(connection._id) : 'pending',
      accessToken: connection?.accessToken ?? (provider === 'square' ? env.square.accessToken : undefined),
      locationId: connection?.locationId,
    });
  },
};
