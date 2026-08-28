import { Router, raw } from 'express';
import { webhookController } from '../controllers/webhook.controller';

export const webhookRoutes = Router();

// Raw body needed for HMAC signature verification over the exact bytes the provider sent.
webhookRoutes.post('/:provider', raw({ type: '*/*', limit: '2mb' }), webhookController.receive);
