import { POSConnection, POSProviderName } from '../models/POSConnection';

export const posConnectionRepository = {
  findByProvider(provider: POSProviderName) {
    return POSConnection.findOne({ provider });
  },

  /** Same query but includes the normally-hidden token fields, for internal use only. */
  findByProviderWithSecrets(provider: POSProviderName) {
    return POSConnection.findOne({ provider }).select('+accessToken +refreshToken');
  },

  findAll() {
    return POSConnection.find();
  },

  upsertConnected(
    provider: POSProviderName,
    data: {
      mode: 'live' | 'mock';
      merchantId?: string;
      locationId?: string;
      locationName?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
      metadata?: Record<string, unknown>;
    },
  ) {
    return POSConnection.findOneAndUpdate(
      { provider },
      { $set: { provider, status: 'connected', ...data } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  },

  markDisconnected(provider: POSProviderName) {
    // Clears merchant/location identity too, not just credentials — a disconnected connection
    // shouldn't show stale "current" account info, especially since reconnecting (or a future
    // OAuth flow) could land on a different merchant/location entirely.
    return POSConnection.findOneAndUpdate(
      { provider },
      {
        $set: { status: 'disconnected' },
        $unset: { accessToken: '', refreshToken: '', merchantId: '', locationId: '', locationName: '' },
      },
      { new: true },
    );
  },
};
