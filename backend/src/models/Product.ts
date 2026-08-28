import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  sku: string;
  description?: string;
  quantity: number;
  // Minor currency units (cents).
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, unique: true, uppercase: true },
    description: { type: String, trim: true, default: '' },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export const Product = model<IProduct>('Product', productSchema);
