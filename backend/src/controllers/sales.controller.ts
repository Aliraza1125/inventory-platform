import { Request, Response } from 'express';
import { salesService } from '../services/sales.service';
import { asyncHandler } from '../middleware/asyncHandler';

export const salesController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const transactions = await salesService.listTransactions();
    res.json({ data: transactions });
  }),

  simulate: asyncHandler(async (req: Request, res: Response) => {
    const result = await salesService.simulateSale({
      productId: req.body.productId,
      posProvider: req.body.posProvider,
      quantity: Number(req.body.quantity),
    });
    res.status(result.status === 'duplicate' ? 200 : 201).json({ data: result });
  }),
};
