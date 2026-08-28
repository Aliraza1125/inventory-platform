import { Request, Response } from 'express';
import { posConnectionService } from '../services/pos-connection.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/AppError';
import { POSProviderName } from '../models/POSConnection';

function assertProvider(value: string): POSProviderName {
  if (value !== 'square' && value !== 'toast') {
    throw AppError.badRequest(`Unknown POS provider "${value}".`, 'UNKNOWN_PROVIDER');
  }
  return value;
}

export const posController = {
  listConnections: asyncHandler(async (_req: Request, res: Response) => {
    const connections = await posConnectionService.listConnections();
    res.json({ data: connections });
  }),

  connect: asyncHandler(async (req: Request, res: Response) => {
    const provider = assertProvider(req.params.provider);
    const connection =
      provider === 'square' ? await posConnectionService.connectSquare() : await posConnectionService.connectToast();
    res.json({ data: connection });
  }),

  disconnect: asyncHandler(async (req: Request, res: Response) => {
    const provider = assertProvider(req.params.provider);
    const connection = await posConnectionService.disconnect(provider);
    res.json({ data: connection });
  }),

  getProducts: asyncHandler(async (req: Request, res: Response) => {
    const provider = assertProvider(req.params.provider);
    const products = await posConnectionService.getProducts(provider);
    res.json({ data: products });
  }),

  getLocations: asyncHandler(async (req: Request, res: Response) => {
    const provider = assertProvider(req.params.provider);
    const locations = await posConnectionService.getLocations(provider);
    res.json({ data: locations });
  }),

  squareOAuthStart: asyncHandler(async (_req: Request, res: Response) => {
    const { authorizeUrl } = posConnectionService.startSquareOAuth();
    res.json({ data: { authorizeUrl } });
  }),

  squareOAuthCallback: asyncHandler(async (req: Request, res: Response) => {
    const code = String(req.query.code ?? '');
    if (!code) {
      throw AppError.badRequest('Missing "code" query parameter from Square redirect.', 'MISSING_CODE');
    }
    const connection = await posConnectionService.completeSquareOAuth(code);
    res.json({ data: connection });
  }),
};
