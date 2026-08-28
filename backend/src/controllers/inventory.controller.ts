import { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';
import { asyncHandler } from '../middleware/asyncHandler';

export const inventoryController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await inventoryService.createProduct(req.body);
    res.status(201).json({ data: product });
  }),

  list: asyncHandler(async (_req: Request, res: Response) => {
    const products = await inventoryService.listProducts();
    res.json({ data: products });
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const result = await inventoryService.getProduct(req.params.id);
    res.json({ data: result });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await inventoryService.deleteProduct(req.params.id);
    res.status(204).send();
  }),

  restock: asyncHandler(async (req: Request, res: Response) => {
    const product = await inventoryService.restock(req.params.id, Number(req.body.quantity));
    res.json({ data: product });
  }),
};
