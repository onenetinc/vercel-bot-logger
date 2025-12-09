#!/bin/bash

# Test script for production Cloud Function with HMAC signature
# Tests the deployed function at: https://us-central1-dv-open-ai-poc.cloudfunctions.net/vercel-bot-logger
# Generates NDJSON data dynamically

FUNCTION_URL="https://us-central1-dv-open-ai-poc.cloudfunctions.net/vercel-bot-logger"

# Get the secret from Secret Manager
echo "Fetching VERCEL_LOG_DRAIN_SECRET from Secret Manager..."
SECRET=$(gcloud secrets versions access latest --secret="vercel-log-drain-secret" --project=dv-open-ai-poc)

if [ -z "$SECRET" ]; then
  echo "Error: Could not fetch secret. Make sure you have access to the secret."
  exit 1
fi

echo "Secret retrieved successfully"
echo ""

# Generate NDJSON with all bot types
TIMESTAMP=$(date +%s)000
NDJSON=""

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
  "omgilibot/1.0"
  "Applebot/1.0"
  "Applebot-Extended/1.0"
  "NeevaBot/1.0"
  "SMTBot/1.0"
  "LAION-crawler/1.0"
)

COUNTER=1
for bot in "${BOTS[@]}"; do
  # Add newline separator (except for first entry)
  if [ $COUNTER -gt 1 ]; then
    NDJSON="${NDJSON}\n"
  fi

  # Generate JSON for this bot with full Vercel log structure
  BOT_TIMESTAMP=$((TIMESTAMP + COUNTER * 1000))
  JSON="{\"id\":\"test_${COUNTER}\",\"timestamp\":${BOT_TIMESTAMP},\"deploymentId\":\"dpl_test123\",\"projectId\":\"prj_test456\",\"source\":\"edge\",\"level\":\"info\",\"type\":\"request\",\"proxy\":{\"timestamp\":${BOT_TIMESTAMP},\"method\":\"GET\",\"scheme\":\"https\",\"host\":\"example.vercel.app\",\"path\":\"/test/${COUNTER}\",\"userAgent\":[\"${bot}\"],\"region\":\"sfo1\",\"statusCode\":200,\"clientIp\":\"203.0.113.${COUNTER}\",\"cacheStatus\":\"MISS\"}}"

  NDJSON="${NDJSON}${JSON}"
  COUNTER=$((COUNTER + 1))
done

BOT_COUNT=${#BOTS[@]}

# Generate HMAC-SHA1 signature
SIGNATURE=$(echo -e "$NDJSON" | openssl dgst -sha1 -hmac "$SECRET" | sed 's/^.* //')

echo "======================================"
echo "Testing Production Cloud Function"
echo "URL: $FUNCTION_URL"
echo "Number of bot test cases: $BOT_COUNT"
echo "======================================"
echo ""
echo "Generated HMAC-SHA1 signature: $SIGNATURE"
echo ""
echo "Sending request with $BOT_COUNT bot test cases..."
echo ""

# Send NDJSON request with signature
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/x-ndjson" \
  -H "x-vercel-signature: $SIGNATURE" \
  --data-binary "$(echo -e "$NDJSON")" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "======================================"
echo "Test completed!"
echo ""
echo "Expected in logs:"
echo "  - Received $BOT_COUNT log entries from Vercel"
echo "  - Filtered to $BOT_COUNT bot log(s)"
echo "  - Successfully inserted $BOT_COUNT bot log(s) to BigQuery"
echo ""
echo "Next steps:"
echo "======================================"
echo ""
echo "1. Check Cloud Function logs:"
echo "   gcloud functions logs read vercel-bot-logger --gen2 --region=us-central1 --limit=50"
echo ""
echo "2. Verify data in BigQuery:"
echo "   bq query --use_legacy_sql=false \\"
echo "     'SELECT timestamp, bot_name, bot_category, method, proxy_path, proxy_status_code"
echo "      FROM \`dvan-media-analytics-ca.llmbot.raw_llmbot_test\`"
echo "      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 MINUTE)"
echo "      ORDER BY timestamp DESC LIMIT 50'"
echo ""
echo "3. Count inserted bot records:"
echo "   bq query --use_legacy_sql=false \\"
echo "     'SELECT bot_category, bot_name, COUNT(*) as count"
echo "      FROM \`dvan-media-analytics-ca.llmbot.raw_llmbot_test\`"
echo "      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 MINUTE)"
echo "      GROUP BY bot_category, bot_name"
echo "      ORDER BY bot_category, bot_name'"
echo ""
echo "======================================"