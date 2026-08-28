import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/AppError';
import { ProviderFactory } from '../providers/provider.factory';
import { posConnectionRepository } from '../repositories/posConnection.repository';
import { processSaleEvent } from '../services/sale-event.service';
import { logger } from '../utils/logger';
import { POSProviderName } from '../models/POSConnection';

function assertProvider(value: string): POSProviderName {
  if (value !== 'square' && value !== 'toast') {
    throw AppError.badRequest(`Unknown POS provider "${value}".`, 'UNKNOWN_PROVIDER');
  }
  return value;
}

export const webhookController = {
  // Auth/malformed-payload errors surface as 4xx; once authenticated, per-event processing
  // errors are logged as FAILED transactions and still ack 200 (see README "Error Handling").
  receive: asyncHandler(async (req: Request, res: Response) => {
    const provider = assertProvider(req.params.provider);
    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody)) {
      throw AppError.badRequest('Webhook body must be raw JSON.', 'INVALID_WEBHOOK_BODY');
    }

    const connection = await posConnectionRepository.findByProviderWithSecrets(provider);
    const posProvider = ProviderFactory.get(provider);

    const events = await posProvider.verifyAndParseWebhook(rawBody, req.headers, {
      connectionId: connection ? String(connection._id) : 'unknown',
      accessToken: connection?.accessToken,
      locationId: connection?.locationId,
    });

    const results = [];
    for (const event of events) {
      try {
        const result = await processSaleEvent(event, 'webhook');
        results.push({ externalTransactionId: event.externalTransactionId, status: result.status });
      } catch (err) {
        logger.warn('Webhook event processing failed (acknowledged anyway)', {
          provider,
          externalTransactionId: event.externalTransactionId,
          error: err instanceof Error ? err.message : err,
        });
        results.push({
          externalTransactionId: event.externalTransactionId,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    res.status(200).json({ received: true, processed: results.length, results });
  }),
};
