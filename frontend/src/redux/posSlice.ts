import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { allocate, connectProvider, disconnectProvider, getAllocations, getConnections } from '@/services/pos.service';
import type { InventoryAllocation, POSConnectionSummary, POSProviderName } from '@/types';
import type { RootState } from './store';

export const fetchConnections = createAsyncThunk('pos/fetchConnections', getConnections);
export const connectProviderThunk = createAsyncThunk('pos/connect', (provider: POSProviderName) =>
  connectProvider(provider),
);
export const disconnectProviderThunk = createAsyncThunk('pos/disconnect', (provider: POSProviderName) =>
  disconnectProvider(provider),
);
export const fetchAllocations = createAsyncThunk('pos/fetchAllocations', getAllocations);
export const allocateThunk = createAsyncThunk(
  'pos/allocate',
  (payload: { productId: string; posProvider: POSProviderName; quantity: number }) => allocate(payload),
);

interface PosState {
  connections: POSConnectionSummary[];
  allocations: InventoryAllocation[];
}

const initialState: PosState = { connections: [], allocations: [] };

function upsertConnection(state: PosState, connection: POSConnectionSummary) {
  const index = state.connections.findIndex((c) => c.provider === connection.provider);
  if (index >= 0) state.connections[index] = connection;
  else state.connections.push(connection);
}

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchConnections.fulfilled, (state, { payload }) => {
        state.connections = payload;
      })
      .addCase(connectProviderThunk.fulfilled, (state, { payload }) => upsertConnection(state, payload))
      .addCase(disconnectProviderThunk.fulfilled, (state, { payload }) => upsertConnection(state, payload))
      .addCase(fetchAllocations.fulfilled, (state, { payload }) => {
        state.allocations = payload;
      });
  },
});

export default posSlice.reducer;

export const selectConnections = (state: RootState) => state.pos.connections;
export const selectAllocations = (state: RootState) => state.pos.allocations;
