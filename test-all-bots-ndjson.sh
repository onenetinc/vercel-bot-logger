#!/bin/bash

# Test all 15+ bot types using NDJSON format
# This simulates how Vercel actually sends logs (multiple entries in one request)

echo "Testing all 15+ bot types with NDJSON format..."
echo ""

# Generate NDJSON with all bot types
TIMESTAMP=$(date +%s)000
NDJSON=""

BOTS=(
  "GPTBot/1.0"
  "ChatGPT-User/1.0"
  "ClaudeBot/1.0"
  "Anthropic-AI/1.0"
  "Google-Extended/1.0"
  "PerplexityBot/1.0"
  "Perplexity-User/1.0"
  "CCBot/2.0"
  "Bytespider/1.0"
  "Diffbot/2.0"
  "YouBot/1.0"
  "Cohere-AI/1.0"
  "facebookbot/1.0"
  "ImagesiftBot/1.0"
  "Omgilibot/1.0"
)

COUNTER=1
for bot in "${BOTS[@]}"; do
  # Add newline separator (except for first entry)
  if [ $COUNTER -gt 1 ]; then
    NDJSON="${NDJSON}\n"
  fi

  # Generate JSON for this bot
  BOT_TIMESTAMP=$((TIMESTAMP + COUNTER * 1000))
  JSON="{\"id\":\"log_ndjson_${COUNTER}\",\"timestamp\":${BOT_TIMESTAMP},\"deploymentId\":\"dpl_test123\",\"projectId\":\"prj_test456\",\"source\":\"lambda\",\"level\":\"info\",\"environment\":\"production\",\"proxy\":{\"timestamp\":${BOT_TIMESTAMP},\"method\":\"GET\",\"host\":\"example.com\",\"path\":\"/test/${COUNTER}\",\"userAgent\":\"${bot}\",\"region\":\"sfo1\",\"statusCode\":200,\"clientIp\":\"192.168.1.${COUNTER}\"}}"

  NDJSON="${NDJSON}${JSON}"
  COUNTER=$((COUNTER + 1))
done

# Send NDJSON request
echo "Sending ${#BOTS[@]} bot entries in single NDJSON request..."
echo ""

curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d "$(echo -e "$NDJSON")"

echo ""
echo ""
echo "Expected output: Received ${#BOTS[@]} log entries from Vercel"
echo "Expected output: Filtered to ${#BOTS[@]} bot log(s)"
echo "Expected output: Successfully inserted ${#BOTS[@]} bot log(s) to BigQuery"
