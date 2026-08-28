import { Schema, model, Document, Types } from 'mongoose';
import { POSProviderName } from './POSConnection';

export type TransactionType = 'SALE' | 'RESTOCK' | 'ADJUSTMENT';
export type TransactionStatus = 'COMPLETED' | 'FAILED';
export type TransactionSource = 'webhook' | 'simulation' | 'manual';

export interface IInventoryTransaction extends Document {
  _id: Types.ObjectId;
  provider: POSProviderName | 'manual';
  externalTransactionId: string;
  productId?: Types.ObjectId;
  quantity: number;
  type: TransactionType;
  source: TransactionSource;
  status: TransactionStatus;
  processedAt: Date;
  idempotencyKey: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    provider: { type: String, enum: ['square', 'toast', 'manual'], required: true },
    externalTransactionId: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    type: { type: String, enum: ['SALE', 'RESTOCK', 'ADJUSTMENT'], required: true },
    source: { type: String, enum: ['webhook', 'simulation', 'manual'], required: true },
    status: { type: String, enum: ['COMPLETED', 'FAILED'], required: true, default: 'COMPLETED' },
    processedAt: { type: Date, required: true, default: () => new Date() },
    // Unique index is the idempotency guard — a repeat insert throws a duplicate-key error.
    idempotencyKey: { type: String, required: true, unique: true },
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const InventoryTransaction = model<IInventoryTransaction>(
  'InventoryTransaction',
  inventoryTransactionSchema,
);
