import { Router } from 'express';
import { salesController } from '../controllers/sales.controller';

export const salesRoutes = Router();

salesRoutes.get('/', salesController.list);
salesRoutes.post('/simulate', salesController.simulate);
