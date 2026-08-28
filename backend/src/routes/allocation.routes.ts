import { Router } from 'express';
import { allocationController } from '../controllers/allocation.controller';

export const allocationRoutes = Router();

allocationRoutes.get('/', allocationController.list);
allocationRoutes.post('/', allocationController.allocate);
