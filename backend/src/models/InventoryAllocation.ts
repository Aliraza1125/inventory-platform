import { Schema, model, Document, Types } from 'mongoose';
import { POSProviderName } from './POSConnection';

export interface IInventoryAllocation extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  posProvider: POSProviderName;
  posProductId: string; // the product's id in the POS's own catalog
  posLocationId?: string;
  allocatedQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryAllocationSchema = new Schema<IInventoryAllocation>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    posProvider: { type: String, enum: ['square', 'toast'], required: true },
    posProductId: { type: String, required: true },
    posLocationId: { type: String },
    allocatedQuantity: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

// A product can only have one allocation record per POS provider (+location).
inventoryAllocationSchema.index({ productId: 1, posProvider: 1, posLocationId: 1 }, { unique: true });
// Fast lookup when resolving an inbound POS sale event back to our product.
inventoryAllocationSchema.index({ posProvider: 1, posProductId: 1 });

export const InventoryAllocation = model<IInventoryAllocation>(
  'InventoryAllocation',
  inventoryAllocationSchema,
);
