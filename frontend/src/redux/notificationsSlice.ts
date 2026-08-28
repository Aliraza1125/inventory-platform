import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

export type NotificationKind = 'success' | 'error' | 'info';

export interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
}

interface NotificationsState {
  items: Notification[];
}

const initialState: NotificationsState = { items: [] };

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notify: {
      reducer(state, action: PayloadAction<Notification>) {
        state.items.push(action.payload);
      },
      prepare(message: string, kind: NotificationKind = 'info') {
        return { payload: { id: Date.now() + Math.random(), kind, message } };
      },
    },
    dismiss(state, action: PayloadAction<number>) {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
  },
});

export const { notify, dismiss } = notificationsSlice.actions;
export default notificationsSlice.reducer;

export const selectNotifications = (state: RootState) => state.notifications.items;
