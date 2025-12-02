# Vercel Bot Logger - BigQuery Integration

Stream LLM bot traffic from Vercel to BigQuery in real-time.

## Overview

This Google Cloud Function (2nd gen) receives Vercel log drain webhooks, filters for 15+ LLM bot types, and streams the data to BigQuery for analytics.

**Features:**
- ✅ Zero changes to your Next.js application
- ✅ Filters 15+ bot types (GPTBot, ClaudeBot, PerplexityBot, etc.)
- ✅ Real-time streaming to BigQuery
- ✅ HMAC-SHA1 signature verification
- ✅ Production-ready error handling

## Architecture

```
Vercel App → Vercel Log Drain → Cloud Function → BigQuery
                (NDJSON)          (Filter Bots)    (Analytics)
```

## Quick Links

- 🚀 [Deployment Guide](DEPLOYMENT.md) - Complete Google Cloud Functions deployment
- 🧪 [Testing Guide](TESTING.md) - Comprehensive testing documentation
- 🤖 [Supported Bots](#supported-bots) - List of all 15+ detected bots
- 📊 [BigQuery Schema](#bigquery-schema) - Table structure and queries

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **BigQuery dataset and table** (created by DVAN)
3. **Vercel account** with project to monitor

## Deployment Steps

### 1. Enable Google Cloud APIs

```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Create Secrets in Secret Manager

```bash
# Store Vercel log drain secret (you'll get this from Vercel)
echo -n "YOUR_VERCEL_SECRET" | gcloud secrets create vercel-log-drain-secret \
  --data-file=- \
  --replication-policy="automatic"

# Store Vercel verification token (you choose this)
echo -n "YOUR_VERIFY_TOKEN" | gcloud secrets create vercel-verify-token \
  --data-file=- \
  --replication-policy="automatic"
```

### 3. Grant IAM Permissions

```bash
# Get your project details
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

# Grant BigQuery Data Editor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/bigquery.dataEditor"

# Grant Secret Manager Secret Accessor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Deploy the Cloud Function

Update the environment variables below with your values:

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

Replace:
- `YOUR_PROJECT_ID` - Your GCP project ID
- `YOUR_DATASET` - Your BigQuery dataset ID
- `YOUR_TABLE` - Your BigQuery table ID

### 5. Get the Function URL

```bash
gcloud functions describe vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --format="value(serviceConfig.uri)"
```

Copy this URL - you'll need it for Vercel configuration.

### 6. Configure Vercel Log Drain

1. Go to **Vercel Dashboard → Team Settings → Log Drains**
2. Click **"Add Log Drain"**
3. Configure:
   - **Delivery Format**: NDJSON
   - **Sources**: Runtime, Edge, Static
   - **Environments**: Production
   - **Endpoint URL**: [Paste your Cloud Function URL]
4. Copy the verification token shown
5. Update the secret in Secret Manager (if different):
   ```bash
   echo -n "VERCEL_VERIFICATION_TOKEN" | gcloud secrets versions add vercel-verify-token --data-file=-
   ```
6. Click **"Verify"** - you should see a green checkmark ✓

## Testing

### Local Testing

```bash
# Start the function locally
npm start

# In another terminal, test with a bot request
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"id":"test123","timestamp":1638360000000,"deploymentId":"dpl_test","projectId":"prj_test","source":"lambda","level":"info","proxy":{"timestamp":1638360000000,"method":"GET","host":"example.com","path":"/","userAgent":"GPTBot/1.0","region":"sfo1","statusCode":200}}'
```

### Production Verification

1. **Trigger bot traffic** to your Vercel app:
   ```bash
   curl -A "GPTBot/1.0" https://your-vercel-app.com
   curl -A "ClaudeBot/1.0" https://your-vercel-app.com/api/test
   ```

2. **Check BigQuery** (data should appear within 60 seconds):
   ```sql
   SELECT bot_name, COUNT(*) as requests
   FROM `project.dataset.table`
   WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
   GROUP BY bot_name;
   ```

3. **View function logs**:
   ```bash
   gcloud functions logs read vercel-bot-logger \
     --gen2 \
     --region=us-central1 \
     --limit=50
   ```

## Supported Bots

The function detects and categorizes these LLM bots:

| Bot Name | Category | Pattern |
|----------|----------|---------|
| GPTBot | OpenAI | `gptbot` |
| ChatGPT-User | OpenAI | `chatgpt-user` |
| ClaudeBot | Anthropic | `claudebot` |
| Anthropic-AI | Anthropic | `anthropic-ai` |
| Google-Extended | Google | `google-extended` |
| PerplexityBot | Perplexity | `perplexitybot` |
| Perplexity-User | Perplexity | `perplexity-user` |
| CCBot | CommonCrawl | `ccbot` |
| Bytespider | ByteDance | `bytespider` |
| Diffbot | Diffbot | `diffbot` |
| YouBot | You.com | `youbot` |
| Cohere-AI | Cohere | `cohere-ai` |
| FacebookBot | Meta | `facebookbot` |
| ImagesiftBot | ImageSift | `imagesiftbot` |
| Omgilibot | Omgili | `omgilibot` |

All patterns are case-insensitive.

## BigQuery Schema

The table contains these fields:

```sql
CREATE TABLE `{project}.{dataset}.{table}` (
  log_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  date DATE NOT NULL,
  hour INT64 NOT NULL,
  bot_name STRING NOT NULL,
  bot_category STRING NOT NULL,
  full_user_agent STRING NOT NULL,
  method STRING NOT NULL,
  path STRING NOT NULL,
  host STRING NOT NULL,
  status_code INT64,
  client_ip STRING,
  region STRING NOT NULL,
  cache_status STRING,
  referer STRING,
  response_size INT64,
  deployment_id STRING NOT NULL,
  project_id STRING NOT NULL,
  environment STRING NOT NULL
)
PARTITION BY date
CLUSTER BY bot_category, bot_name, hour;
```

## Monitoring

### Key Metrics

- **Function invocations**: Should match your Vercel request volume
- **Bot detection rate**: Check ratio of bot logs / total logs
- **BigQuery inserts**: Monitor success rate in logs
- **Errors**: Should be < 1%

### View Logs

```bash
# Real-time logs
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --limit=50 \
  --format="table(time, message)"
```

### Common Log Messages

- `Received X log entries from Vercel` - Total logs received
- `Filtered to X bot log(s)` - Bot traffic detected
- `Successfully inserted X bot log(s) to BigQuery` - Data saved
- `Invalid signature detected` - Authentication failure
- `No bot traffic to insert` - No bots in this batch

## Troubleshooting

### No data in BigQuery

1. Check function logs for errors
2. Verify Vercel log drain shows green checkmark
3. Verify IAM permissions on service account
4. Test locally with curl command

### Signature verification failures

1. Verify `VERCEL_LOG_DRAIN_SECRET` matches Vercel's secret
2. Check Secret Manager has correct value
3. Redeploy function after updating secrets

### Missing bot detections

1. Check bot pattern regex in [src/utils/bot-detector.ts](src/utils/bot-detector.ts)
2. Verify user agent field is being extracted correctly
3. Test locally with sample log entry

## Cost Estimation

- **Cloud Functions**: $5-15/month (100K-500K invocations)
- **BigQuery**: $5-20/month (1-5GB storage + queries)
- **Secret Manager**: <$1/month
- **Total**: ~$10-35/month (varies with traffic)

## Adding New Bots

To add new bot types, edit [src/utils/bot-detector.ts](src/utils/bot-detector.ts):

```typescript
const BOT_PATTERNS: Record<string, { regex: RegExp; category: BotCategory }> = {
  // ... existing patterns
  NewBotName: { regex: /newbot/i, category: 'NewCategory' },
};
```

If adding a new category, also update `BotCategory` in [src/types/bigquery.types.ts](src/types/bigquery.types.ts).

## Project Structure

```
.
├── src/
│   ├── index.ts                 # Main HTTP function handler
│   ├── types/
│   │   ├── vercel.types.ts      # Vercel webhook types
│   │   └── bigquery.types.ts    # BigQuery schema types
│   ├── utils/
│   │   ├── vercel-auth.ts       # HMAC signature verification
│   │   ├── bot-detector.ts      # Bot detection & categorization
│   │   └── log-transformer.ts   # Vercel → BigQuery mapping
│   └── services/
│       └── bigquery.service.ts  # BigQuery streaming service
├── lib/                         # Compiled JavaScript
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript config
└── .gcloudignore                # Deployment exclusions
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally
npm start

# Deploy to GCP
npm run deploy  # (requires additional flags)
```

## References

- [Vercel Log Drains Documentation](https://vercel.com/docs/drains/reference/logs)
- [BigQuery Streaming API](https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery)
- [Cloud Functions Documentation](https://cloud.google.com/functions/docs)

## License

MIT
