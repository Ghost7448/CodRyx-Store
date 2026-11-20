# CodRyx Store — Paymob integration specification

## Current implementation state

The repository currently contains a frontend-only Vite/React application. Checkout, pending order, success/failure presentation, customer order list, and Admin Center payment/refund overview are preview UI only. Orders created in this preview live in React memory and are lost on refresh. No charge is made and no subscription or bot is activated.

## Confirmed product decisions

- Payment provider: Paymob.
- International payments: required from launch, subject to the merchant account's actual country, currency, and card acceptance eligibility.
- Manual transfers: disabled.
- Card data must be collected only by Paymob-hosted checkout; never build a local card-number/CVV form.

## Backend work required before production

1. Create a durable order in the database with a server-generated unique order ID, user ID, product/plan ID, immutable amount, currency, status PENDING, and timestamps.
2. Create the Paymob checkout/payment session from the backend using the current official Paymob API flow enabled for this merchant account. Never expose API credentials or secret keys to Vite/React.
3. Return only the hosted checkout URL/session reference to the authenticated frontend and redirect the customer to Paymob.
4. Receive the provider callback/webhook on a public HTTPS backend endpoint. Verify callback authenticity using the current Paymob signature/HMAC procedure and merchant-specific secret. Do not trust query parameters or the browser success redirect.
5. Verify the provider transaction is successful and matches the expected merchant, order reference, exact amount, and currency. Process events idempotently so duplicate callbacks cannot duplicate entitlements.
6. Change an order to PAID only after server-side verification. Then create/renew the subscription and enqueue the bot deployment. Keep payment confirmation and provisioning auditable.
7. Keep failure/cancellation states separate from PAID. A browser return to the success URL must never mark an order as paid.
8. Implement refunds through the backend using the provider's supported refund API and verified transaction reference. Record who requested/approved the refund, amount, reason, provider response, and final refund status.

## Suggested backend API contract

- POST /api/orders — authenticated customer creates a pending order from a catalog product/plan ID. The backend calculates the amount; do not accept a trusted amount from the browser.
- POST /api/payments/paymob/checkout — creates a hosted Paymob checkout session for a pending order and returns the checkout URL.
- POST /api/payments/paymob/webhook — verifies and processes Paymob server notifications; idempotent.
- GET /api/orders — returns only the signed-in customer's orders; Admin role may query platform orders.
- GET /api/orders/:orderId — returns an order only if the requester owns it or has explicit admin permission.
- POST /api/admin/refunds — admin-authorized refund operation, protected by role checks and audit logging.

## Order/payment state model

PENDING → PAID → REFUND_PENDING → REFUNDED

PENDING may instead become FAILED or CANCELLED. A failed refund must not silently change the original payment state. Keep provider transaction status and internal order status as separate auditable fields where needed.

## Environment variables (backend only)

Use the exact variable names and credentials required by the selected Paymob integration after merchant approval. Store them in the hosting provider's encrypted environment-variable manager, not in source control, frontend code, screenshots, or logs. Do not commit real values to .env files. Add a .env.example with placeholder names only after the backend framework and Paymob API flow are selected.

## Go-live checklist

- Merchant account approved and international acceptance/currencies confirmed with Paymob.
- Test and live credentials separated.
- HTTPS callback URL registered with Paymob.
- Webhook signature verification and idempotency tested.
- Exact amount/currency/order matching tested.
- Success, failure, cancellation, duplicate webhook, delayed webhook, and refund scenarios tested.
- Database-backed orders and audit logs enabled.
- Provisioning is triggered only after verified PAID state.
