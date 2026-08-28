/** Shape Square posts to webhook subscriptions for order/payment events (v2 Webhooks API). */
export interface SquareWebhookEnvelope {
  merchant_id: string;
  type: string; // e.g. "order.updated", "payment.created"
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: Record<string, unknown>;
  };
}
