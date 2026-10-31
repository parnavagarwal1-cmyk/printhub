# PrintFlow — Deployment Guide

This guide details the deployment of the PrintFlow web application to **Vercel** and database/storage to **Supabase**.

---

## 1. Supabase Deployment

### 1.1 Database Schema
1. Create a new Supabase project in the Supabase Dashboard.
2. In the **SQL Editor**, execute the migration script:
   - `supabase/migrations/20261030000000_init_schema.sql`
3. Optionally seed the database with initial shops and printers:
   - `supabase/seed.sql`

### 1.2 Storage Bucket Configuration
1. Navigate to **Storage** in Supabase Dashboard.
2. Create a private bucket named `printflow-documents`:
   - Public bucket: **Disabled** (Private)
   - Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - Max file size: `52428800` (50MB)
3. Set RLS storage policies allowing authorized uploads and expiring presigned URL downloads.

---

## 2. Vercel Web Deployment

1. Connect your Git repository to **Vercel**.
2. Set the Root Directory to `apps/web`.
3. Configure the Environment Variables in Vercel Project Settings:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Production URL (e.g., `https://printflow.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Client Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (Server-only) |
| `PAYMENT_PROVIDER` | `razorpay` or `cashfree` |
| `RAZORPAY_KEY_ID` | Production Gateway Key ID |
| `RAZORPAY_KEY_SECRET` | Production Gateway Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured on payment webhook dashboard |

4. Deploy the application.

---

## 3. Webhook Configuration

In your Razorpay or Cashfree Dashboard:
- **Webhook URL**: `https://printflow.app/api/payments/webhook`
- **Events to subscribe**:
  - `payment.captured`
  - `order.paid`
- **Secret**: Must match `RAZORPAY_WEBHOOK_SECRET` or `CASHFREE_WEBHOOK_SECRET`.
