import { FilterQuery } from 'mongoose';
import { Product, IProduct } from '../models/Product';

export const productRepository = {
  create(data: Pick<IProduct, 'name' | 'sku' | 'description' | 'quantity' | 'price'>) {
    return Product.create(data);
  },

  findAll(filter: FilterQuery<IProduct> = {}) {
    return Product.find(filter).sort({ createdAt: -1 });
  },

  findById(id: string) {
    return Product.findById(id);
  },

  findBySku(sku: string) {
    return Product.findOne({ sku: sku.toUpperCase() });
  },

  deleteById(id: string) {
    return Product.findByIdAndDelete(id);
  },

  // Atomic conditional decrement; returns null if stock is insufficient (see README §12).
  decrementIfAvailable(id: string, amount: number) {
    return Product.findOneAndUpdate(
      { _id: id, quantity: { $gte: amount } },
      { $inc: { quantity: -amount } },
      { new: true },
    );
  },

  incrementQuantity(id: string, amount: number) {
    return Product.findByIdAndUpdate(id, { $inc: { quantity: amount } }, { new: true });
  },

  countAll() {
    return Product.countDocuments();
  },

  sumQuantity() {
    return Product.aggregate<{ _id: null; total: number }>([
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]).then((rows) => rows[0]?.total ?? 0);
  },
};
