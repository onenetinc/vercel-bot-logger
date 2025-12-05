#!/bin/bash

# Test all 33 bot types individually (sequential requests)
# Each bot is sent in a separate HTTP request

echo "Testing all 33 bot types with individual requests..."
echo ""

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

echo ""
echo "Test completed - sent ${#BOTS[@]} individual requests"
