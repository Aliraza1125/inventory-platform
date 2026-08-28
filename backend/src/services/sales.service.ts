import crypto from 'crypto';
import { POSProviderName } from '../models/POSConnection';
import { allocationRepository } from '../repositories/allocation.repository';
import { posConnectionRepository } from '../repositories/posConnection.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { processSaleEvent, SaleProcessingResult } from './sale-event.service';
import { ProviderFactory } from '../providers/provider.factory';
import { mockToastProvider } from '../providers/mock/mock-toast.provider';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export interface SimulateSaleDTO {
  productId: string;
  posProvider: POSProviderName;
  quantity: number;
}

export const salesService = {
  async listTransactions() {
    return transactionRepository.findAll();
  },

  // Builds a NormalizedSaleEvent like a real webhook and runs it through processSaleEvent() —
  // same path as POST /api/webhooks/:provider. Blocked for "live" providers (see below): a
  // connected-but-real POS can only be depleted by its own authenticated webhook.
  async simulateSale(dto: SimulateSaleDTO): Promise<SaleProcessingResult> {
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw AppError.badRequest('Quantity must be a positive number.', 'VALIDATION_ERROR');
    }

    if (ProviderFactory.modeFor(dto.posProvider) === 'live') {
      throw AppError.badRequest(
        `${dto.posProvider} is a live connection — its inventory can only be depleted by a real webhook from ${dto.posProvider}, not a simulated sale.`,
        'SIMULATION_NOT_ALLOWED_FOR_LIVE_PROVIDER',
      );
    }

    const connection = await posConnectionRepository.findByProvider(dto.posProvider);
    if (!connection || connection.status !== 'connected') {
      throw AppError.badRequest(`${dto.posProvider} is not connected.`, 'POS_NOT_CONNECTED');
    }

    const allocation = await allocationRepository.findOne(dto.productId, dto.posProvider, connection.locationId);
    if (!allocation) {
      throw AppError.badRequest(
        `Product has no allocation on ${dto.posProvider}. Allocate inventory to this POS before simulating a sale.`,
        'NO_ALLOCATION',
      );
    }

    const externalTransactionId = `sim_${dto.posProvider}_${crypto.randomUUID()}`;
    const occurredAt = new Date();

    const result = await processSaleEvent(
      {
        provider: dto.posProvider,
        externalTransactionId,
        posProductId: allocation.posProductId,
        quantity: dto.quantity,
        locationId: allocation.posLocationId,
        occurredAt,
        raw: { simulated: true },
      },
      'simulation',
    );

    // Best-effort push of the new count back to the POS; never fails the sale.
    if (result.status === 'processed' && result.allocationAfter !== undefined) {
      try {
        const provider = ProviderFactory.get(dto.posProvider);
        await provider.updateInventory(
          { connectionId: String(connection._id), accessToken: connection.accessToken, locationId: connection.locationId },
          { posProductId: allocation.posProductId, quantity: result.allocationAfter, locationId: connection.locationId },
        );
      } catch (err) {
        logger.warn('Failed to push post-sale inventory update to POS (non-fatal for the demo)', {
          error: err instanceof Error ? err.message : err,
        });
      }
    }

    return result;
  },

  async simulateMockToastEvent(connectionId: string, posProductId: string, quantity: number) {
    const event = mockToastProvider.simulateSaleEvent(connectionId, posProductId, quantity);
    return processSaleEvent(event, 'simulation');
  },
};
