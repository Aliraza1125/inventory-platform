import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getSales } from '@/services/sales.service';
import type { InventoryTransaction } from '@/types';
import type { RootState } from './store';

export const fetchSales = createAsyncThunk('sales/fetchSales', getSales);

interface SalesState {
  transactions: InventoryTransaction[];
  loading: boolean;
}

const initialState: SalesState = { transactions: [], loading: false };

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSales.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSales.fulfilled, (state, { payload }) => {
        state.transactions = payload;
        state.loading = false;
      });
  },
});

export default salesSlice.reducer;

export const selectTransactions = (state: RootState) => state.sales.transactions;
