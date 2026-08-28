import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './dashboardSlice';
import inventoryReducer from './inventorySlice';
import notificationsReducer from './notificationsSlice';
import posReducer from './posSlice';
import salesReducer from './salesSlice';

export const store = configureStore({
  reducer: {
    inventory: inventoryReducer,
    pos: posReducer,
    sales: salesReducer,
    dashboard: dashboardReducer,
    notifications: notificationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
