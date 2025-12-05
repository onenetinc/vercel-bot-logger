# Testing Guide - Vercel Bot Logger

Complete guide for testing the Vercel Bot Logger locally and in production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Testing](#local-testing)
- [Production Testing](#production-testing)
- [Integration Testing](#integration-testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before testing, ensure you have:

1. **Dependencies installed**:

   ```bash
   npm install
   ```

2. **TypeScript compiled**:

   ```bash
   npm run build
   ```

3. **Environment variables** (for local testing):

   ```bash
   # Copy the template and fill in your values
   cp .env.local.example .env.local

   # Edit .env.local with your actual values
   # GCP_PROJECT=your-gcp-project-id
   # DATASET_ID=your_bigquery_dataset
   # TABLE_ID=your_bigquery_table
   # VERCEL_LOG_DRAIN_SECRET=your-vercel-secret
   # VERCEL_VERIFY_TOKEN=your-vercel-token
   ```

   **Note:** `.env.local` is already in `.gitignore` and will not be committed.

---

## Local Testing

### 1. Start the Function Locally

```bash
npm start
```

This starts the Cloud Function on `http://localhost:8080`

### 2. Test Verification Header

Verify that the function returns the verification header:

```bash
curl -i http://localhost:8080
```

**Expected output:**

```
HTTP/1.1 200 OK
x-vercel-verify: your-token
Content-Type: text/html; charset=utf-8
Content-Length: 2

OK
```

### 3. Test Bot Detection - GPTBot

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "id": "log_gptbot_001",
    "timestamp": 1701360000000,
    "deploymentId": "dpl_test123",
    "projectId": "prj_test456",
    "source": "lambda",
    "level": "info",
    "environment": "production",
    "proxy": {
      "timestamp": 1701360000000,
      "method": "GET",
      "host": "example.com",
      "path": "/api/content",
      "userAgent": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot",
      "region": "sfo1",
      "statusCode": 200,
      "clientIp": "192.168.1.1"
    }
  }'
```

**Expected console output:**

```
Received 1 log entries from Vercel
Filtered to 1 bot log(s)
Successfully inserted 1 bot log(s) to BigQuery
```

### 4. Test Bot Detection - ClaudeBot

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "id": "log_claude_001",
    "timestamp": 1701360000000,
    "deploymentId": "dpl_test123",
    "projectId": "prj_test456",
    "source": "edge",
    "level": "info",
    "environment": "production",
    "proxy": {
      "timestamp": 1701360000000,
      "method": "GET",
      "host": "example.com",
      "path": "/",
      "userAgent": "ClaudeBot/1.0",
      "region": "iad1",
      "statusCode": 200,
      "clientIp": "10.0.0.1",
      "vercelCache": "HIT"
    }
  }'
```

### 5. Test Array User Agent Format

Test handling of user agent as an array:

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "id": "log_array_001",
    "timestamp": 1701360000000,
    "deploymentId": "dpl_test123",
    "projectId": "prj_test456",
    "source": "lambda",
    "level": "info",
    "environment": "production",
    "proxy": {
      "timestamp": 1701360000000,
      "method": "POST",
      "host": "example.com",
      "path": "/api/webhook",
      "userAgent": ["Mozilla/5.0", "PerplexityBot/1.0"],
      "region": "dfw1",
      "statusCode": 201,
      "clientIp": "172.16.0.1"
    }
  }'
```

### 6. Test Non-Bot Traffic (Should Be Filtered Out)

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "id": "log_human_001",
    "timestamp": 1701360000000,
    "deploymentId": "dpl_test123",
    "projectId": "prj_test456",
    "source": "lambda",
    "level": "info",
    "environment": "production",
    "proxy": {
      "timestamp": 1701360000000,
      "method": "GET",
      "host": "example.com",
      "path": "/",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/119.0.0.0 Safari/537.36",
      "region": "sfo1",
      "statusCode": 200,
      "clientIp": "203.0.113.1"
    }
  }'
```

**Expected console output:**

```
Received 1 log entries from Vercel
Filtered to 0 bot log(s)
No bot traffic to insert
```

### 7. Test NDJSON Format (Multiple Logs)

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"id":"log_001","timestamp":1701360000000,"deploymentId":"dpl_test","projectId":"prj_test","source":"lambda","level":"info","proxy":{"timestamp":1701360000000,"method":"GET","host":"example.com","path":"/","userAgent":"GPTBot/1.0","region":"sfo1","statusCode":200}}
{"id":"log_002","timestamp":1701360100000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1701360100000,"method":"GET","host":"example.com","path":"/api/data","userAgent":"ClaudeBot/1.0","region":"iad1","statusCode":200}}
{"id":"log_003","timestamp":1701360200000,"deploymentId":"dpl_test","projectId":"prj_test","source":"lambda","level":"info","proxy":{"timestamp":1701360200000,"method":"POST","host":"example.com","path":"/api/search","userAgent":"PerplexityBot/1.0","region":"dfw1","statusCode":201}}'
```

**Expected console output:**

```
Received 3 log entries from Vercel
Filtered to 3 bot log(s)
Successfully inserted 3 bot log(s) to BigQuery
```

### 8. Test All 33 Bot Types

#### Option A: Individual Requests (Sequential)

Test script that sends each bot as a separate request:

```bash
#!/bin/bash

BOTS=(
  "GPTBot/1.0"
  "ChatGPT-User/1.0"
  "ChatGPT-PageFetcher/1.0"
  "ClaudeBot/1.0"
  "Anthropic-AI/1.0"
  "Google-Extended/1.0"
  "GoogleOther/1.0"
  "GoogleOther-Image/1.0"
  "PerplexityBot/1.0"
  "Perplexity-User/1.0"
  "PPLX-Agent/1.0"
  "CCBot/2.0"
  "Bytespider/1.0"
  "Diffbot/2.0"
  "DiffbotBot/1.0"
  "YouBot/1.0"
  "Cohere-AI/1.0"
  "Cohere-User-Agent/1.0"
  "facebookbot/1.0"
  "Meta-ExternalFetcher/1.0"
  "Meta-Indexer/1.0"
  "ImagesiftBot/1.0"
  "omgili/1.0"
  "Omgilibot/1.0"
  "Applebot/1.0"
  "Applebot-Extended/1.0"
  "NeevaBot/1.0"
  "SMTBot/1.0"
  "LAION-crawler/1.0"
  "LAION-crawler-v1/1.0"
  "LAION-crawler-v2/1.0"
  "LAION-crawler-test/1.0"
  "LAION-crawler-prod/1.0"
)

for bot in "${BOTS[@]}"; do
  echo "Testing: $bot"
  curl -s -X POST http://localhost:8080 \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"log_$(date +%s)\",\"timestamp\":$(date +%s)000,\"deploymentId\":\"dpl_test\",\"projectId\":\"prj_test\",\"source\":\"lambda\",\"level\":\"info\",\"proxy\":{\"timestamp\":$(date +%s)000,\"method\":\"GET\",\"host\":\"example.com\",\"path\":\"/\",\"userAgent\":\"${bot}\",\"region\":\"sfo1\",\"statusCode\":200}}"
  echo ""
  sleep 1
done
```

Save as `test-all-bots.sh`, make executable (`chmod +x test-all-bots.sh`), and run:

```bash
./test-all-bots.sh
```

#### Option B: NDJSON Format (Single Request) - **Recommended**

This script tests all 33 bots in a single NDJSON request (simulates real Vercel behavior):

**Use the included script:**

```bash
./test-all-bots-ndjson.sh
```

This script sends all 33 bot entries in one NDJSON request, which more accurately reflects how Vercel sends batched logs. Expected output:

```text
Received 33 log entries from Vercel
Filtered to 33 bot log(s)
Successfully inserted 33 bot log(s) to BigQuery
```

**Technical Note:** The test script uses `Content-Type: text/plain` to bypass the Functions Framework's JSON body parser, which would fail on NDJSON. In production, Vercel sends with `Content-Type: application/json`, but Cloud Functions handles this correctly with raw body access.

---

## Production Testing

### 1. Deploy the Function

```bash
gcloud functions deploy vercel-bot-logger \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handleVercelLogs \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT=your-project,DATASET_ID=your_dataset,TABLE_ID=your_table \
  --set-secrets VERCEL_LOG_DRAIN_SECRET=vercel-log-drain-secret:latest,VERCEL_VERIFY_TOKEN=vercel-verify-token:latest
```

### 2. Get the Function URL

```bash
FUNCTION_URL=$(gcloud functions describe vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --format="value(serviceConfig.uri)")

echo "Function URL: $FUNCTION_URL"
```

### 3. Test Verification Header

```bash
curl -i $FUNCTION_URL
```

### 4. Simulate Bot Traffic to Your Vercel App

Once the log drain is configured, trigger real bot traffic:

```bash
# Simulate GPTBot
curl -A "GPTBot/1.0" https://your-vercel-app.com

# Simulate ClaudeBot
curl -A "ClaudeBot/1.0" https://your-vercel-app.com/api/test

# Simulate PerplexityBot
curl -A "PerplexityBot/1.0" https://your-vercel-app.com/about
```

### 5. Check Cloud Function Logs

```bash
# Real-time logs
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --limit=50

# Filter for specific messages
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --limit=50 \
  | grep "bot log"
```

### 6. Verify Data in BigQuery

Within 60 seconds of bot traffic, run this query:

```sql
-- Check recent bot traffic
SELECT
  timestamp,
  bot_name,
  bot_category,
  method,
  proxy_path,
  proxy_status_code,
  region,
  execution_region,
  cache_status
FROM `your-project.your_dataset.your_table`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
ORDER BY timestamp DESC
LIMIT 20;
```

### 7. Verify Bot Detection (Acceptance Criteria)

```sql
-- From Objective.md
SELECT bot_name, COUNT(*) as requests
FROM `your-project.your_dataset.your_table`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
GROUP BY bot_name;
```

**Expected output:**

```
bot_name         | requests
-----------------|---------
GPTBot          | 5
ClaudeBot       | 3
PerplexityBot   | 2
...
```

### 8. Check Data Quality

```sql
-- Verify no null bot names
SELECT COUNT(*) as null_bot_names
FROM `your-project.your_dataset.your_table`
WHERE bot_name IS NULL;
-- Should return 0

-- Verify timestamp accuracy
SELECT
  MIN(timestamp) as earliest,
  MAX(timestamp) as latest,
  COUNT(*) as total_logs
FROM `your-project.your_dataset.your_table`;

-- Check bot category distribution
SELECT
  bot_category,
  COUNT(*) as requests,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM `your-project.your_dataset.your_table`
GROUP BY bot_category
ORDER BY requests DESC;

-- Verify new schema fields are populated
SELECT
  COUNT(DISTINCT request_id) as unique_request_ids,
  COUNT(DISTINCT trace_id) as unique_trace_ids,
  COUNT(*) FILTER (WHERE proxy_timestamp IS NOT NULL) as has_proxy_timestamp,
  COUNT(*) FILTER (WHERE cache_id IS NOT NULL) as has_cache_id,
  COUNT(*) FILTER (WHERE waf_action IS NOT NULL) as has_waf_action
FROM `your-project.your_dataset.your_table`;
```

---

## Integration Testing

### Test Vercel Log Drain Integration

1. **Configure Log Drain** in Vercel Dashboard
2. **Check Vercel's verification** (green checkmark)
3. **Generate traffic** to your Vercel app
4. **Monitor Cloud Function logs**:

   ```bash
   gcloud functions logs read vercel-bot-logger \
     --gen2 \
     --region=us-central1 \
     --limit=100 \
     --format="table(time, message)"
   ```

5. **Query BigQuery** to confirm data arrival

### Test Signature Verification

Test with invalid signature:

```bash
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -H "x-vercel-signature: invalid_signature_12345" \
  -d '{"id":"test","timestamp":1701360000000,"deploymentId":"dpl_test","projectId":"prj_test","source":"lambda","level":"info","proxy":{"timestamp":1701360000000,"method":"GET","host":"example.com","path":"/","userAgent":"GPTBot/1.0","region":"sfo1","statusCode":200}}'
```

**Check logs** - should see: "Invalid signature detected"

### Test Error Handling

Send malformed JSON:

```bash
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d 'this is not valid json'
```

**Should still return 200 OK** (prevents retry loops)

---

## Troubleshooting

### Issue: No data in BigQuery

**Check:**

1. Function logs for errors:

   ```bash
   gcloud functions logs read vercel-bot-logger --gen2 --region=us-central1 | grep -i error
   ```

2. IAM permissions:

   ```bash
   gcloud projects get-iam-policy your-project \
     --flatten="bindings[].members" \
     --filter="bindings.members:compute@developer.gserviceaccount.com"
   ```

3. Environment variables:

   ```bash
   gcloud functions describe vercel-bot-logger \
     --gen2 \
     --region=us-central1 \
     --format="value(serviceConfig.environmentVariables)"
   ```

### Issue: Bot not detected

**Test bot detection locally:**

```bash
# Test the bot-detector directly
node -e "
const { detectBot } = require('./lib/utils/bot-detector');
console.log(detectBot('GPTBot/1.0'));
console.log(detectBot('YourBot/1.0'));
"
```

**Check user agent format** in logs - might be array vs string

### Issue: Function timeout

**Check execution time:**

```bash
gcloud functions logs read vercel-bot-logger \
  --gen2 \
  --region=us-central1 \
  --format="value(timestamp, execution_id, severity, message)"
```

**Increase timeout** if needed:

```bash
gcloud functions deploy vercel-bot-logger \
  --gen2 \
  --timeout=120s \
  ...
```

### Issue: Signature verification failures

**Verify secret matches:**

```bash
# Check secret in Secret Manager
gcloud secrets versions access latest --secret="vercel-log-drain-secret"

# Compare with Vercel's secret (from Vercel Dashboard)
```

---

## Performance Testing

### Load Test with Multiple Concurrent Requests

```bash
#!/bin/bash

# Send 100 bot requests in parallel
for i in {1..100}; do
  (
    curl -s -X POST http://localhost:8080 \
      -H "Content-Type: application/json" \
      -d "{\"id\":\"log_$i\",\"timestamp\":$(date +%s)000,\"deploymentId\":\"dpl_test\",\"projectId\":\"prj_test\",\"source\":\"lambda\",\"level\":\"info\",\"proxy\":{\"timestamp\":$(date +%s)000,\"method\":\"GET\",\"host\":\"example.com\",\"path\":\"/test$i\",\"userAgent\":\"GPTBot/1.0\",\"region\":\"sfo1\",\"statusCode\":200}}"
  ) &
done

wait
echo "Load test completed"
```

### Monitor BigQuery Streaming Performance

```sql
-- Check insert latency
SELECT
  TIMESTAMP_DIFF(processed_at, timestamp, SECOND) as processing_latency_seconds,
  COUNT(*) as logs_count
FROM `your-project.your_dataset.your_table`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 MINUTE)
GROUP BY processing_latency_seconds
ORDER BY processing_latency_seconds;
```

---

## Test Checklist

Before considering deployment complete, verify:

- [ ] Local function starts without errors
- [ ] Verification header returns correctly
- [ ] All 33 bot types detected (use test script)
- [ ] Non-bot traffic filtered out
- [ ] NDJSON format parsed correctly
- [ ] Array user agent format handled
- [ ] Data appears in BigQuery within 60 seconds
- [ ] Cloud Function logs show successful inserts
- [ ] No null bot_name values in BigQuery
- [ ] Function returns 200 OK even on errors
- [ ] Invalid signatures logged but don't crash
- [ ] Vercel log drain shows green checkmark
- [ ] SQL verification query returns bot names

---

## Useful Commands Reference

```bash
# Start locally
npm start

# View local logs
# (logs appear in console where npm start runs)

# Deploy to production
gcloud functions deploy vercel-bot-logger --gen2 ...

# View production logs (real-time)
gcloud functions logs read vercel-bot-logger --gen2 --region=us-central1 --limit=50

# View function details
gcloud functions describe vercel-bot-logger --gen2 --region=us-central1

# Update environment variables
gcloud functions deploy vercel-bot-logger --gen2 --update-env-vars KEY=VALUE

# Delete function (if needed)
gcloud functions delete vercel-bot-logger --gen2 --region=us-central1
```

---

## Additional Resources

- [Google Cloud Functions Testing](https://cloud.google.com/functions/docs/testing/test-http)
- [BigQuery Streaming Troubleshooting](https://cloud.google.com/bigquery/docs/troubleshooting-streaming)
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains)
