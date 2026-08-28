import { POSProviderName } from '../models/POSConnection';
import { POSProvider } from './pos-provider.interface';
import { SquareProvider } from './square/square.provider';
import { toastProvider } from './toast/toast.provider';
import { mockToastProvider } from './mock/mock-toast.provider';
import { isToastLive } from '../config/env';

const squareProvider = new SquareProvider();

// Single place that decides which concrete POSProvider backs a given provider name.
export class ProviderFactory {
  static get(provider: POSProviderName): POSProvider {
    switch (provider) {
      case 'square':
        return squareProvider;
      case 'toast':
        return isToastLive() ? toastProvider : mockToastProvider;
      default:
        throw new Error(`Unknown POS provider: ${provider}`);
    }
  }

  /** What the frontend should badge the connection as, independent of live status. */
  static modeFor(provider: POSProviderName): 'live' | 'mock' {
    return ProviderFactory.get(provider).mode;
  }
}
