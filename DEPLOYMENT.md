# Deployment Guide - Google Cloud Functions

Complete step-by-step guide for deploying the Vercel Bot Logger to Google Cloud Functions (2nd gen).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Troubleshooting](#troubleshooting)
- [Quick Reference](#quick-reference)

---

## Prerequisites

Before deploying, ensure you have:

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed - [Installation Guide](https://cloud.google.com/sdk/docs/install)
3. **BigQuery dataset and table** created (see schema below)
4. **Vercel account** with a project to monitor
5. **Project built locally** (`npm run build` completed successfully)

### BigQuery Table Schema (32 fields)

The BigQuery table must be created with this exact schema:

```sql
CREATE TABLE `{project}.{dataset}.{table}` (
  -- Core identifiers
  log_id STRING NOT NULL,
  request_id STRING,
  trace_id STRING,
  span_id STRING,

  -- Timestamps
  timestamp TIMESTAMP NOT NULL,
  date DATE NOT NULL,
  hour INT64 NOT NULL,
  proxy_timestamp TIMESTAMP,
  processed_at TIMESTAMP NOT NULL,

  -- Bot detection
  bot_name STRING NOT NULL,
  bot_category STRING NOT NULL,
  full_user_agent STRING NOT NULL,

  -- HTTP request details
  method STRING NOT NULL,
  path STRING,
  proxy_path STRING NOT NULL,
  host STRING NOT NULL,
  proxy_scheme STRING,
  proxy_referer STRING,

  -- Deployment context
  deployment_id STRING NOT NULL,
  project_id STRING NOT NULL,
  source STRING NOT NULL,
  entrypoint STRING,
  environment STRING,

  -- Response details
  status_code INT64,
  proxy_status_code INT64,
  level STRING NOT NULL,

  -- Network & performance
  client_ip STRING,
  region STRING NOT NULL,
  execution_region STRING,

  -- Caching
  cache_status STRING,
  cache_id STRING,

  -- Security (WAF)
  waf_action STRING,
  waf_rule STRING,

  -- Additional metadata
  raw_message STRING
)
PARTITION BY date
CLUSTER BY bot_category, bot_name, hour;
```

This schema maps to Vercel's log drain format and captures 33 bot types across 16 categories.

---

## Step-by-Step Deployment

### Step 1: Authenticate and Set Up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Set your project (replace YOUR_PROJECT_ID with your actual project ID)
gcloud config set project YOUR_PROJECT_ID

# Verify current project
gcloud config get-value project
```

**Expected output:**
```
YOUR_PROJECT_ID
```

---

### Step 2: Enable Required Google Cloud APIs

```bash
# Enable Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com

# Enable BigQuery API
gcloud services enable bigquery.googleapis.com

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Enable Cloud Build API (required for deployment)
gcloud services enable cloudbuild.googleapis.com

# Verify enabled services
gcloud services list --enabled | grep -E "cloudfunctions|bigquery|secretmanager|cloudbuild"
```

**Expected output:**
```
cloudbuild.googleapis.com            Cloud Build API
cloudfunctions.googleapis.com        Cloud Functions API
bigquery.googleapis.com              BigQuery API
secretmanager.googleapis.com         Secret Manager API
```

---

### Step 3: Create Secrets in Secret Manager

#### 3.1: Create Vercel Log Drain Secret

```bash
# You'll get this from Vercel Dashboard after configuring the log drain
# For now, use a placeholder and update it later
echo -n "PLACEHOLDER_SECRET" | gcloud secrets create vercel-log-drain-secret \
  --data-file=- \
  --replication-policy="automatic"
```

#### 3.2: Create Vercel Verification Token

```bash
# Generate a secure random token
VERIFY_TOKEN=$(openssl rand -hex 32)
echo "Generated verification token: $VERIFY_TOKEN"

# Create the secret
echo -n "$VERIFY_TOKEN" | gcloud secrets create vercel-verify-token \
  --data-file=- \
  --replication-policy="automatic"
```

**Save this token** - you'll need it when configuring Vercel!

#### 3.3: Verify Secrets Were Created

```bash
gcloud secrets list
```

**Expected output:**
```
NAME                        CREATED              REPLICATION_POLICY  LOCATIONS
vercel-log-drain-secret     2025-12-03T10:30:00  automatic           -
vercel-verify-token         2025-12-03T10:30:00  automatic           -
```

---

### Step 4: Configure IAM Permissions

```bash
# Get your project details
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

echo "Project ID: $PROJECT_ID"
echo "Project Number: $PROJECT_NUMBER"
echo "Service Account: $SERVICE_ACCOUNT"
```

#### 4.1: Grant BigQuery Permissions

```bash
# Grant BigQuery Data Editor role (allows inserting data)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.dataEditor"
```

#### 4.2: Grant Secret Manager Permissions

```bash
# Grant Secret Manager Secret Accessor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

#### 4.3: Verify Permissions

```bash
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:$SERVICE_ACCOUNT"
```

**Expected output should include:**
```
roles/bigquery.dataEditor
roles/secretmanager.secretAccessor
```

---

### Step 5: Build the Project

```bash
# Navigate to project directory
cd /Users/killer/Desktop/one-net/big-query-data-logging

# Install dependencies (if not already done)
npm install

# Build TypeScript to JavaScript
npm run build

# Verify build output
ls -la lib/
```

**Expected output:**
```
lib/
├── index.js
├── index.d.ts
├── services/
├── types/
└── utils/
```

---

### Step 6: Deploy to Cloud Functions

**⚠️ IMPORTANT:** Replace these values before running:
- `YOUR_PROJECT_ID` → Your GCP project ID
- `YOUR_DATASET` → Your BigQuery dataset name (e.g., `bot_logs`)
- `YOUR_TABLE` → Your BigQuery table name (e.g., `vercel_bot_traffic`)

```bash
gcloud functions deploy vercel-bot-logger \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handleVercelLogs \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=60s \
  --memory=256MB \
  --max-instances=10 \
  --set-env-vars GCP_PROJECT=YOUR_PROJECT_ID,DATASET_ID=YOUR_DATASET,TABLE_ID=YOUR_TABLE \
  --set-secrets VERCEL_LOG_DRAIN_SECRET=vercel-log-drain-secret:latest,VERCEL_VERIFY_TOKEN=vercel-verify-token:latest
```

**Deployment Progress:**
```
Deploying function (may take a while - up to 2 minutes)...
⠹ Building function...
⠹ Deploying function...
✓ Deploying function... Done.
✓ Setting IAM Policy for the function... Done.
```

**Deployment typically takes 2-5 minutes.**

---

### Step 7: Get the Function URL

```bash
# Retrieve the deployed function URL
FUNCTION_URL=$(gcloud functions describe vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --format="value(serviceConfig.uri)")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Function URL: $FUNCTION_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

**📋 COPY THIS URL** - You'll need it for Vercel configuration!

**Expected output:**
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/vercel-bot-logger
```

---

### Step 8: Test the Deployed Function

```bash
# Test verification header
curl -i $FUNCTION_URL
```

**Expected output:**
```
HTTP/2 200
x-vercel-verify: YOUR_VERIFY_TOKEN
content-type: text/html; charset=utf-8
content-length: 2

OK
```

✅ If you see the `x-vercel-verify` header, the deployment is successful!

---

### Step 9: Configure Vercel Log Drain

#### 9.1: Access Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/)
2. Navigate to: **Team Settings → Log Drains**
3. Click **"Add Log Drain"**

#### 9.2: Configure Log Drain Settings

Fill in the following:

| Setting | Value |
|---------|-------|
| **Delivery Format** | NDJSON |
| **Sources** | ✅ Runtime<br>✅ Edge<br>✅ Static |
| **Environments** | Production |
| **Endpoint URL** | Paste your `$FUNCTION_URL` from Step 7 |

#### 9.3: Handle Vercel's Secret

After entering the URL, Vercel will display:
- A **log drain secret** (for HMAC signature)
- A **verification challenge**

**Update the log drain secret in Secret Manager:**

```bash
# Vercel will show you a secret like: "whsec_xxxxxxxxxxxxx"
echo -n "VERCEL_SECRET_FROM_DASHBOARD" | gcloud secrets versions add vercel-log-drain-secret \
  --data-file=-

# Redeploy to pick up the new secret
gcloud functions deploy vercel-bot-logger \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handleVercelLogs \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=60s \
  --memory=256MB \
  --max-instances=10 \
  --set-env-vars GCP_PROJECT=YOUR_PROJECT_ID,DATASET_ID=YOUR_DATASET,TABLE_ID=YOUR_TABLE \
  --set-secrets VERCEL_LOG_DRAIN_SECRET=vercel-log-drain-secret:latest,VERCEL_VERIFY_TOKEN=vercel-verify-token:latest
```

#### 9.4: Verify Connection

1. Click **"Verify"** in Vercel Dashboard
2. Wait for the green checkmark ✅
3. Click **"Save"** to activate the log drain

**✅ Verification successful** means Vercel can communicate with your Cloud Function!

---

### Step 10: Verify Deployment End-to-End

#### 10.1: Monitor Function Logs

```bash
# View real-time logs
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --limit=50

# Filter for bot-related logs
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --limit=50 \
  | grep -E "bot log|Received|Filtered"
```

#### 10.2: Trigger Test Bot Traffic

```bash
# Simulate bot traffic to your Vercel app
# Replace YOUR_VERCEL_APP with your actual Vercel app URL

curl -A "GPTBot/1.0" https://YOUR_VERCEL_APP.vercel.app
curl -A "ClaudeBot/1.0" https://YOUR_VERCEL_APP.vercel.app/api/test
curl -A "PerplexityBot/1.0" https://YOUR_VERCEL_APP.vercel.app/about
```

#### 10.3: Check BigQuery (within 60 seconds)

Open [BigQuery Console](https://console.cloud.google.com/bigquery) and run:

```sql
-- Replace with your actual project, dataset, and table
SELECT
  timestamp,
  bot_name,
  bot_category,
  method,
  proxy_path,
  proxy_status_code,
  region,
  execution_region,
  cache_status,
  waf_action
FROM `YOUR_PROJECT_ID.YOUR_DATASET.YOUR_TABLE`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
ORDER BY timestamp DESC
LIMIT 20;
```

**Expected output:**
```
timestamp                  | bot_name     | bot_category | method | proxy_path | proxy_status_code | region | execution_region | cache_status | waf_action
---------------------------|--------------|--------------|--------|------------|-------------------|--------|------------------|--------------|------------
2025-12-03 10:45:23 UTC   | GPTBot       | OpenAI       | GET    | /          | 200               | sfo1   | iad1             | MISS         | NULL
2025-12-03 10:45:25 UTC   | ClaudeBot    | Anthropic    | GET    | /api/test  | 200               | iad1   | iad1             | HIT          | NULL
2025-12-03 10:45:27 UTC   | PerplexityBot| Perplexity   | GET    | /about     | 200               | dfw1   | dfw1             | MISS         | NULL
```

#### 10.4: Run Acceptance Criteria Query

From [Objective.md](Objective.md):

```sql
SELECT bot_name, COUNT(*) as requests
FROM `YOUR_PROJECT_ID.YOUR_DATASET.YOUR_TABLE`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
GROUP BY bot_name;
```

**Expected output:**
```
bot_name         | requests
-----------------|----------
GPTBot           | 5
ClaudeBot        | 3
PerplexityBot    | 2
Google-Extended  | 1
```

✅ **If you see bot names (not null/empty), deployment is fully successful!**

---

## Troubleshooting

### Issue: "Permission denied" during deployment

**Cause:** Insufficient permissions or not authenticated

**Solution:**
```bash
# Re-authenticate
gcloud auth login

# Verify project
gcloud config get-value project

# Enable Cloud Build API (often forgotten)
gcloud services enable cloudbuild.googleapis.com
```

---

### Issue: Function deployed but no data in BigQuery

**Diagnosis Steps:**

#### 1. Check Function Logs for Errors

```bash
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  | grep -i error
```

**Common errors:**
- `Error: Could not load the default credentials` → IAM issue
- `Permission denied on bigquery` → Missing BigQuery permissions
- `Failed to parse log line` → NDJSON format issue

#### 2. Verify IAM Permissions

```bash
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --flatten="bindings[].members" \
  --filter="bindings.members:compute@developer.gserviceaccount.com"
```

**Should include:**
- `roles/bigquery.dataEditor`
- `roles/secretmanager.secretAccessor`

**Fix:** Re-run Step 4 to grant permissions.

#### 3. Check Environment Variables

```bash
gcloud functions describe vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --format="yaml(serviceConfig.environmentVariables)"
```

**Should show:**
```yaml
GCP_PROJECT: your-project-id
DATASET_ID: your_dataset
TABLE_ID: your_table
```

**Fix:** Redeploy with correct `--set-env-vars`.

#### 4. Verify Secrets Are Accessible

```bash
# Check if secrets exist
gcloud secrets list

# Try to access secret value
gcloud secrets versions access latest --secret="vercel-verify-token"
```

**Fix:** Re-create secrets if missing (Step 3).

---

### Issue: Vercel verification fails (no green checkmark)

**Cause:** Verification token mismatch or function not accessible

**Diagnosis:**

```bash
# Test function directly
curl -i $FUNCTION_URL

# Look for x-vercel-verify header
```

**Expected:**
```
x-vercel-verify: YOUR_TOKEN_HERE
```

**Solutions:**

1. **Token mismatch:**
   ```bash
   # Check current token
   gcloud secrets versions access latest --secret="vercel-verify-token"

   # Update if needed
   echo -n "NEW_TOKEN" | gcloud secrets versions add vercel-verify-token --data-file=-

   # Redeploy
   gcloud functions deploy vercel-bot-logger --gen2 --region=us-central1 # ... (full command from Step 6)
   ```

2. **Function not accessible:**
   ```bash
   # Check function status
   gcloud functions describe vercel-bot-logger \
     --gen2 \
     --region=us-central1 \
     --format="value(state,serviceConfig.uri)"

   # Should show: ACTIVE
   ```

---

### Issue: "Invalid signature detected" in logs

**Cause:** HMAC secret mismatch between Vercel and Secret Manager

**Solution:**

```bash
# Get the secret Vercel is using (from Vercel Dashboard)
# Then update Secret Manager:
echo -n "VERCEL_SECRET_FROM_DASHBOARD" | gcloud secrets versions add vercel-log-drain-secret \
  --data-file=-

# Redeploy function
gcloud functions deploy vercel-bot-logger --gen2 # ... (full command from Step 6)
```

---

### Issue: Deployment fails with "Build failed"

**Cause:** Missing dependencies or TypeScript compilation errors

**Solution:**

```bash
# Clean and rebuild
rm -rf node_modules lib
npm install
npm run build

# Check for errors
echo $?  # Should be 0

# Verify lib/ directory exists
ls -la lib/

# Try deployment again
```

---

### Issue: High latency or timeouts

**Diagnosis:**

```bash
# Check execution time
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --format="value(timestamp,execution_id,severity,message)"
```

**Solution:** Increase timeout and memory:

```bash
gcloud functions deploy vercel-bot-logger \
  --gen2 \
  --timeout=120s \
  --memory=512MB \
  # ... (rest of deployment command)
```

---

## Quick Reference

### View Function Details

```bash
gcloud functions describe vercel-bot-logger \
  --gen2 \
  --region=us-central1
```

### View Real-Time Logs

```bash
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --limit=50
```

### Update Environment Variables

```bash
gcloud functions deploy vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --update-env-vars KEY=VALUE
```

### Update Secrets

```bash
# Update secret value
echo -n "NEW_SECRET" | gcloud secrets versions add SECRET_NAME --data-file=-

# Redeploy to pick up changes
gcloud functions deploy vercel-bot-logger --gen2 # ... (full command)
```

### Delete Function

```bash
gcloud functions delete vercel-bot-logger \
  --gen2 \
  --region=us-central1
```

### List All Functions

```bash
gcloud functions list --gen2
```

### View Function Metrics

```bash
gcloud functions describe vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --format="value(serviceConfig.uri,state,updateTime)"
```

---

## Deployment Checklist

Use this checklist to ensure successful deployment:

- [ ] gcloud CLI installed and authenticated (`gcloud auth login`)
- [ ] Google Cloud project created with billing enabled
- [ ] Project ID set (`gcloud config set project`)
- [ ] Required APIs enabled (Step 2)
- [ ] Secrets created in Secret Manager (Step 3)
- [ ] IAM permissions granted to service account (Step 4)
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiled successfully (`npm run build`)
- [ ] `lib/` directory exists with compiled JS
- [ ] Function deployed to Cloud Functions (Step 6)
- [ ] Function URL obtained (Step 7)
- [ ] Function responds with verification header (Step 8)
- [ ] Vercel log drain configured (Step 9)
- [ ] Vercel verification shows green checkmark ✅
- [ ] Test bot traffic sent to Vercel app
- [ ] Data appears in BigQuery within 60 seconds
- [ ] SQL verification query returns bot names (not null)
- [ ] Function logs show successful inserts

---

## Post-Deployment Monitoring

### Daily Checks

```bash
# Check error rate
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --limit=100 \
  | grep -i error

# Verify data freshness in BigQuery
```

```sql
SELECT MAX(timestamp) as last_log
FROM `YOUR_PROJECT_ID.YOUR_DATASET.YOUR_TABLE`;
-- Should be recent (within last hour)
```

### Weekly Review

```sql
-- Bot traffic summary
SELECT
  DATE(timestamp) as date,
  bot_category,
  COUNT(*) as requests
FROM `YOUR_PROJECT_ID.YOUR_DATASET.YOUR_TABLE`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY date, bot_category
ORDER BY date DESC, requests DESC;
```

---

## Additional Resources

- [Google Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [BigQuery Streaming API](https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery)
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)

---

**🎉 Congratulations! Your Vercel Bot Logger is now live and capturing LLM bot traffic in real-time!**
