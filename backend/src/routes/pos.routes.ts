import { Router } from 'express';
import { posController } from '../controllers/pos.controller';

export const posRoutes = Router();

posRoutes.get('/connections', posController.listConnections);
posRoutes.post('/:provider/connect', posController.connect);
posRoutes.post('/:provider/disconnect', posController.disconnect);
posRoutes.get('/:provider/products', posController.getProducts);
posRoutes.get('/:provider/locations', posController.getLocations);

// Square OAuth (see providers/square/square.oauth.ts for details/caveats).
posRoutes.get('/square/oauth/authorize', posController.squareOAuthStart);
posRoutes.get('/square/oauth/callback', posController.squareOAuthCallback);
