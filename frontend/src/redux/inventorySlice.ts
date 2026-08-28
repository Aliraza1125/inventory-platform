import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { createProduct, getProduct, getProducts, restockProduct } from '@/services/inventory.service';
import type { Product, ProductDetail } from '@/types';
import type { RootState } from './store';

export const fetchProducts = createAsyncThunk('inventory/fetchProducts', getProducts);
export const fetchProduct = createAsyncThunk('inventory/fetchProduct', getProduct);
export const createProductThunk = createAsyncThunk('inventory/createProduct', createProduct);
export const restockProductThunk = createAsyncThunk(
  'inventory/restockProduct',
  ({ id, quantity }: { id: string; quantity: number }) => restockProduct(id, quantity),
);

interface InventoryState {
  items: Product[];
  current: ProductDetail | null;
  loading: boolean;
}

const initialState: InventoryState = { items: [], current: null, loading: false };

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProducts.fulfilled, (state, { payload }) => {
        state.items = payload;
        state.loading = false;
      })
      .addCase(fetchProduct.fulfilled, (state, { payload }) => {
        state.current = payload;
      });
  },
});

export default inventorySlice.reducer;

export const selectProducts = (state: RootState) => state.inventory.items;
export const selectCurrentProduct = (state: RootState) => state.inventory.current;
export const selectInventoryLoading = (state: RootState) => state.inventory.loading;
