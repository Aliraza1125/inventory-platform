import { Router } from 'express';
import { inventoryRoutes } from './inventory.routes';
import { posRoutes } from './pos.routes';
import { allocationRoutes } from './allocation.routes';
import { salesRoutes } from './sales.routes';
import { dashboardRoutes } from './dashboard.routes';
import { webhookRoutes } from './webhook.routes';

export const apiRouter = Router();

apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/pos', posRoutes);
apiRouter.use('/allocations', allocationRoutes);
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
// Mounted separately in app.ts so its raw-body parsing doesn't leak into the global JSON parser.
export { webhookRoutes };
