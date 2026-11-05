# Crucible Zero-Cost Deployment Guide

This guide details how to deploy Crucible to production at **$0/month total cost**, with **no purchased domain**, **no paid tiers**, and **no expiring trials**.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Vercel Free Tier (Next.js) |
                      |    https://crucible.vercel.app|
                      +--------------+--------------+
                                     |
             +-----------------------+-----------------------+
             | First-party rewrites:                         | Direct WebSocket:
             | /api/v1/*                                     | wss://crucible-collab.onrender.com
             v                                               v
+-------------------------------+             +-------------------------------+
|  Render Free Web Service (API)|             | Render Free Web Service (Collab)|
|   Docker: apps/api/Dockerfile |             |   Docker: apps/collab/Dockerfile|
| https://crucible-api.onrender |             | https://crucible-collab.onrender|
+---------------+---------------+             +---------------+---------------+
                |                                             |
   +------------+------------+                                |
   |            |            |                                |
   v            v            v                                v
+------+    +-------+   +----------+                     +---------+
| Neon |    |Brevo  |   | RapidAPI |                     | Upstash |
|Postgres   |Email  |   | Judge0   |                     | Redis   |
+------+    +-------+   +----------+                     +---------+
   |            |            |
   v            v            v
+----------+ +--------+ +-----------+
| Supabase | |LiveKit | | Browser   |
| S3 Storage | Cloud  | | Recording |
+----------+ +--------+ +-----------+
```

---

## External Services & Free Tier Limits

| Service           | Component                     | Free Tier Quota / Specifications                                 | Cost      |
| :---------------- | :---------------------------- | :--------------------------------------------------------------- | :-------- |
| **Vercel**        | Web Frontend                  | 100 GB bandwidth/mo, unlimited serverless functions              | **$0.00** |
| **Render**        | API & Collab Web Services     | 750 free instance hours/month, 512 MB RAM, sleeps after 15m idle | **$0.00** |
| **Neon**          | PostgreSQL Database           | 0.5 GB storage, serverless compute, auto-suspend                 | **$0.00** |
| **Upstash**       | Redis (Presence & Rate Limit) | 10,000 commands/day, TLS enabled                                 | **$0.00** |
| **LiveKit Cloud** | WebRTC Video, Audio, Screen   | 10,000 participant minutes/mo, 100 concurrent participants       | **$0.00** |
| **RapidAPI**      | Judge0 CE Code Execution      | 50 submissions/day, 10 requests/sec                              | **$0.00** |
| **Supabase**      | Object Storage (S3 API)       | 1 GB storage, 2 GB egress/mo, 50 MB max file upload              | **$0.00** |
| **Brevo**         | Transactional Email           | 300 emails/day, single sender verification (no domain required)  | **$0.00** |

---

## Step 1: External Free Tier Setup Checklist

Follow these exact steps to obtain the free keys and connection strings:

### 1. Neon Serverless PostgreSQL

1. Sign up at [neon.tech](https://neon.tech) (Free tier).
2. Create a project named `crucible-production`.
3. In the project dashboard, copy the **Connection string** (Direct and Pooled).
   - `DATABASE_URL`: `postgresql://[user]:[password]@[endpoint]-pooler.neon.tech/neondb?sslmode=require`
   - `DIRECT_URL`: `postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require`

### 2. Upstash Redis

1. Sign up at [upstash.com](https://upstash.com) (Free tier).
2. Create a Redis database named `crucible-redis` in the same region as Render (e.g. US-East / Oregon).
3. Copy the **Node.js ioredis connection string** (starts with `rediss://`).
   - `REDIS_URL`: `rediss://default:[password]@[endpoint].upstash.io:6379`

### 3. LiveKit Cloud

1. Sign up at [livekit.io](https://livekit.io) for the free **Build Plan**.
2. Create a project named `crucible-demo`.
3. In Project Settings -> Keys, copy:
   - `LIVEKIT_URL`: `wss://crucible-demo-xxxx.livekit.cloud`
   - `LIVEKIT_API_KEY`: `APIxxxxxxxx`
   - `LIVEKIT_API_SECRET`: `secretxxxxxxxx`

### 4. RapidAPI (Judge0 CE)

1. Sign up at [rapidapi.com](https://rapidapi.com).
2. Navigate to [Judge0 CE on RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce).
3. Subscribe to the **Basic (Free) Plan** ($0/month, 50 requests/day).
4. Copy your `X-RapidAPI-Key` from the dashboard.
   - `RAPIDAPI_KEY`: `your_rapidapi_key`
   - `RAPIDAPI_JUDGE0_HOST`: `judge0-ce.p.rapidapi.com`

### 5. Supabase Storage (S3 API)

1. Sign up at [supabase.com](https://supabase.com).
2. Create a new free project `crucible-storage`.
3. Navigate to **Storage** -> Create a new public/private bucket named `crucible-recordings`.
4. Navigate to **Project Settings** -> **Storage** -> **S3 Access Keys**:
   - Generate a new S3 access key pair.
   - Endpoint: `https://[project-ref].supabase.co/storage/v1/s3`
   - `SUPABASE_S3_ACCESS_KEY`: `[access-key-id]`
   - `SUPABASE_S3_SECRET_KEY`: `[secret-access-key]`
   - `SUPABASE_S3_BUCKET`: `crucible-recordings`
   - `SUPABASE_S3_REGION`: `us-east-1`

### 6. Brevo (Transactional Email)

1. Sign up at [brevo.com](https://brevo.com) (Free plan, 300 emails/day).
2. In **Senders & IP**, add your personal email address as a **Verified Sender**. Confirm via the email sent to your inbox.
3. In **SMTP & API** -> **API Keys**, create a new API Key.
   - `BREVO_API_KEY`: `xkeysib-xxxxxxxxx`
   - `BREVO_SENDER_EMAIL`: `your-verified-email@example.com`
   - `BREVO_SENDER_NAME`: `Crucible`

---

## Step 2: Render Deployment (API & Collab)

Crucible includes a root `render.yaml` specification for Render Blueprints.

1. Push your branch to GitHub.
2. Sign in to [render.com](https://render.com).
3. Click **New** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render detects `render.yaml` and provisions two free web services:
   - `crucible-api`
   - `crucible-collab`
6. Fill in the prompted secret environment variables:
   - `DATABASE_URL`: Your Neon Postgres connection string
   - `DIRECT_URL`: Your Neon Postgres direct connection string
   - `REDIS_URL`: Your Upstash Redis connection string
   - `JWT_SECRET`: Random 32+ character string
   - `COLLAB_TOKEN_SECRET`: Random 32+ character string (shared between api and collab)
   - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   - `RAPIDAPI_KEY`
   - `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_ACCESS_KEY`, `SUPABASE_S3_SECRET_KEY`
   - `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`
   - `APP_URL`: `https://[your-app].vercel.app`
7. Click **Apply**.
8. Render builds both Dockerfiles and runs `prisma migrate deploy` automatically on startup.
9. Note down the resulting service URLs:
   - API: `https://crucible-api-xxxx.onrender.com`
   - Collab: `wss://crucible-collab-xxxx.onrender.com`

---

## Step 3: Vercel Deployment (Frontend)

1. Sign in to [vercel.com](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Set **Root Directory** to `apps/web`.
5. In **Environment Variables**, configure:
   - `NEXT_PUBLIC_API_URL`: `/api/v1`
   - `API_PROXY_TARGET`: `https://crucible-api-xxxx.onrender.com` (your Render API URL)
   - `NEXT_PUBLIC_COLLAB_URL`: `wss://crucible-collab-xxxx.onrender.com` (your Render Collab URL)
6. Click **Deploy**.
7. Vercel compiles and publishes your app at `https://[your-project].vercel.app`.

---

## Step 4: Seed Demo Data (Manual Command)

To populate the database with a ready-to-present interview scenario, complete scorecard, questions, rubric, and timeline replay:

1. Run the seed script locally or against the production database:
   ```bash
   DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require" \
   DEMO_INTERVIEWER_PASSWORD="YourSecurePassword123!" \
   pnpm --filter @crucible/api db:seed
   ```
2. Log into `https://[your-project].vercel.app` using:
   - Email: `interviewer@crucible.dev`
   - Password: `YourSecurePassword123!`

---

## Free-Tier Behavior & Limitations

- **Render Cold Starts**: Free web services spin down after 15 minutes of inactivity. When a user opens the application, the UI automatically displays a _"Waking up server..."_ banner and polls `/health` until the API is warm (~30-50 seconds).
- **Collab WebSocket Persistence**: Active WebSocket traffic prevents the collab service from sleeping while an interview is in session.
- **Judge0 Daily Quota**: RapidAPI free plan allows 50 submissions/day. Crucible displays the remaining executions in the editor panel. On 429, a clear banner notifies the candidate that executions are paused until midnight UTC.
- **Supabase Storage Quota**: Continuous 10-second chunks are encoded at 500 kbps video + 64 kbps audio (~700 KB/chunk). Recordings stay safely within the 1 GB total storage limit.
