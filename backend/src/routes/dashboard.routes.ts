import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';

export const dashboardRoutes = Router();

dashboardRoutes.get('/summary', dashboardController.summary);
