import { Request, Response } from 'express';
import { allocationService } from '../services/allocation.service';
import { asyncHandler } from '../middleware/asyncHandler';

export const allocationController = {
  allocate: asyncHandler(async (req: Request, res: Response) => {
    const allocation = await allocationService.allocate({
      productId: req.body.productId,
      posProvider: req.body.posProvider,
      quantity: Number(req.body.quantity),
      posProductId: req.body.posProductId,
    });
    res.status(201).json({ data: allocation });
  }),

  list: asyncHandler(async (_req: Request, res: Response) => {
    const allocations = await allocationService.listAllocations();
    res.json({ data: allocations });
  }),
};
