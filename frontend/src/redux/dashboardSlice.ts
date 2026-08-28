import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getDashboardSummary } from '@/services/dashboard.service';
import type { DashboardSummary } from '@/types';
import type { RootState } from './store';

export const fetchDashboardSummary = createAsyncThunk('dashboard/fetchSummary', getDashboardSummary);

interface DashboardState {
  summary: DashboardSummary | null;
  loading: boolean;
}

const initialState: DashboardState = { summary: null, loading: false };

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardSummary.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboardSummary.fulfilled, (state, { payload }) => {
        state.summary = payload;
        state.loading = false;
      });
  },
});

export default dashboardSlice.reducer;

export const selectDashboardSummary = (state: RootState) => state.dashboard.summary;
export const selectDashboardLoading = (state: RootState) => state.dashboard.loading;
