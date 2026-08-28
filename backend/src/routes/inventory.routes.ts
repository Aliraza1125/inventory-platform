import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';

export const inventoryRoutes = Router();

inventoryRoutes.get('/', inventoryController.list);
inventoryRoutes.post('/', inventoryController.create);
inventoryRoutes.get('/:id', inventoryController.getOne);
inventoryRoutes.delete('/:id', inventoryController.remove);
inventoryRoutes.post('/:id/restock', inventoryController.restock);
