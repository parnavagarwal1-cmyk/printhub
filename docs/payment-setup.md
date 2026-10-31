# PrintFlow — Payment Integration & Gateway Setup Guide

PrintFlow supports **Razorpay**, **Cashfree**, and an integrated **Sandbox / Mock Provider** for testing without live bank credentials.

---

## 1. Supported Payment Architecture

1. Customer configures document options (Color, Duplex, Copies, Paper Size).
2. The server computes the authoritative price in integer paise.
3. The server generates a Dynamic UPI Payment QR (`upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...`).
4. Customer scans and pays using any UPI app (GPay, PhonePe, Paytm, BHIM).
5. The payment gateway sends a cryptographically signed webhook to `/api/payments/webhook`.
6. The server verifies the signature (HMAC SHA256) and amount, marks payment as successful, and moves the print job to `queued` for the Windows Print Agent.

---

## 2. Razorpay Configuration

In `.env`:
```ini
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyy
RAZORPAY_WEBHOOK_SECRET=zzzzzzzzzzzzzzzzzzzz
```

### Configuring Webhooks in Razorpay:
- **Webhook URL**: `https://your-domain.com/api/payments/webhook`
- **Secret**: Must match `RAZORPAY_WEBHOOK_SECRET`
- **Active Events**:
  - `payment.captured`
  - `order.paid`

---

## 3. Cashfree Configuration

In `.env`:
```ini
PAYMENT_PROVIDER=cashfree
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_WEBHOOK_SECRET=your_cashfree_webhook_secret
CASHFREE_ENV=PRODUCTION # or TEST
```

---

## 4. Sandbox & Testing Mode

When `PAYMENT_PROVIDER=mock` or when API keys are not provided:
- The dynamic UPI payment QR displays a simulation banner.
- The customer modal includes a **"Simulate Paid & Authorize Job"** button.
- The webhook endpoint and verification engine simulate the end-to-end payment gateway lifecycle and trigger the Windows spooler automatically.
