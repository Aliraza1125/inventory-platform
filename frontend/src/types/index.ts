export type POSProviderName = 'square' | 'toast';
export type POSMode = 'live' | 'mock';
export type POSStatus = 'connected' | 'disconnected' | 'error';

export interface Product {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  quantity: number;
  allocatedQuantity: number;
  availableQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface POSConnectionSummary {
  provider: POSProviderName;
  mode: POSMode;
  status: POSStatus;
  merchantId?: string;
  locationId?: string;
  locationName?: string;
  updatedAt?: string;
}

export interface InventoryAllocation {
  _id: string;
  productId: string | Product;
  posProvider: POSProviderName;
  posProductId: string;
  posLocationId?: string;
  allocatedQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'SALE' | 'RESTOCK' | 'ADJUSTMENT';
export type TransactionStatus = 'COMPLETED' | 'FAILED';
export type TransactionSource = 'webhook' | 'simulation' | 'manual';

export interface InventoryTransaction {
  _id: string;
  provider: POSProviderName | 'manual';
  externalTransactionId: string;
  productId?: string | Product;
  quantity: number;
  type: TransactionType;
  source: TransactionSource;
  status: TransactionStatus;
  processedAt: string;
  idempotencyKey: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalInventory: number;
  connectedPOS: POSProviderName[];
  recentSales: InventoryTransaction[];
}

export interface SaleProcessingResult {
  status: 'processed' | 'duplicate';
  transaction: InventoryTransaction;
  productQuantityBefore?: number;
  productQuantityAfter?: number;
  allocationBefore?: number;
  allocationAfter?: number;
}

export interface ProductDetail {
  product: Product;
  allocations: InventoryAllocation[];
  transactions: InventoryTransaction[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export interface SquareCheckoutResult {
  orderId: string;
  paymentId: string;
  paymentStatus?: string;
  totalMoney: string;
  productName: string;
}
