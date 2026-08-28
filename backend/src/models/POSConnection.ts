import { Schema, model, Document, Types } from 'mongoose';

export type POSProviderName = 'square' | 'toast';
export type POSConnectionStatus = 'connected' | 'disconnected' | 'error';
export type POSConnectionMode = 'live' | 'mock';

export interface IPOSConnection extends Document {
  _id: Types.ObjectId;
  provider: POSProviderName;
  mode: POSConnectionMode; // "live" (real API) vs "mock" (simulated) — surfaced directly in the UI
  status: POSConnectionStatus;
  merchantId?: string;
  locationId?: string;
  locationName?: string;
  // Plaintext for this demo; production should encrypt at rest (see README "Security").
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const posConnectionSchema = new Schema<IPOSConnection>(
  {
    provider: { type: String, enum: ['square', 'toast'], required: true },
    mode: { type: String, enum: ['live', 'mock'], required: true },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error'],
      required: true,
      default: 'disconnected',
    },
    merchantId: { type: String },
    locationId: { type: String },
    locationName: { type: String },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    expiresAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// One active connection document per provider for this single-tenant demo.
posConnectionSchema.index({ provider: 1 }, { unique: true });

export const POSConnection = model<IPOSConnection>('POSConnection', posConnectionSchema);
