#!/bin/bash

# Test with JSON array format (matches actual Vercel webhook format)
# Tests the deployed function at: https://us-central1-dv-open-ai-poc.cloudfunctions.net/vercel-bot-logger

FUNCTION_URL="https://us-central1-dv-open-ai-poc.cloudfunctions.net/vercel-bot-logger"

echo "======================================"
echo "Test - JSON Array Format (Actual Vercel Format)"
echo "URL: $FUNCTION_URL"
echo "======================================"
echo ""

# Test 1: Single bot in array
echo "Test 1: Single GPTBot in Array"
echo "---------------------"
BODY='[{"id":"simple-test-1","timestamp":1702934400000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934400000,"method":"GET","host":"example.vercel.app","path":"/test","userAgent":["GPTBot/1.0"],"region":"sfo1","statusCode":200}}]'

echo "Body (1 entry in array)"
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  --data-binary "$BODY" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# Test 2: Three bots in array
echo "Test 2: Three Bots in Array"
echo "------------------------------"
BODY='[{"id":"simple-test-2","timestamp":1702934401000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934401000,"method":"GET","host":"example.vercel.app","path":"/test2","userAgent":["ClaudeBot/1.0"],"region":"iad1","statusCode":200}},{"id":"simple-test-3","timestamp":1702934402000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934402000,"method":"GET","host":"example.vercel.app","path":"/test3","userAgent":["PerplexityBot/1.0"],"region":"dfw1","statusCode":200}},{"id":"simple-test-4","timestamp":1702934403000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934403000,"method":"GET","host":"example.vercel.app","path":"/test4","userAgent":["Google-Extended/1.0"],"region":"sfo1","statusCode":200}}]'

echo "Body (3 entries in array)"
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  --data-binary "$BODY" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# Test 3: All 29 bots in array
echo "Test 3: All 29 Bots in Array"
echo "--------------------------------"

TIMESTAMP=$(date +%s)000
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

# Build JSON array
JSON_ARRAY="["
COUNTER=1
for bot in "${BOTS[@]}"; do
  BOT_TIMESTAMP=$((TIMESTAMP + COUNTER * 1000))

  if [ $COUNTER -gt 1 ]; then
    JSON_ARRAY="${JSON_ARRAY},"
  fi

  JSON_ARRAY="${JSON_ARRAY}{\"id\":\"test_${COUNTER}\",\"timestamp\":${BOT_TIMESTAMP},\"deploymentId\":\"dpl_test123\",\"projectId\":\"prj_test456\",\"source\":\"edge\",\"level\":\"info\",\"type\":\"request\",\"proxy\":{\"timestamp\":${BOT_TIMESTAMP},\"method\":\"GET\",\"scheme\":\"https\",\"host\":\"example.vercel.app\",\"path\":\"/test/${COUNTER}\",\"userAgent\":[\"${bot}\"],\"region\":\"sfo1\",\"statusCode\":200,\"clientIp\":\"203.0.113.${COUNTER}\",\"cacheStatus\":\"MISS\"}}"

  COUNTER=$((COUNTER + 1))
done
JSON_ARRAY="${JSON_ARRAY}]"

echo "Body (${#BOTS[@]} entries in array)"
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  --data-binary "$JSON_ARRAY" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "======================================"
echo "All tests completed!"
echo ""
echo "Check logs:"
echo "gcloud functions logs read vercel-bot-logger --gen2 --region=us-central1 --limit=50"
echo ""
echo "Expected results:"
echo "  Test 1: Received 1 log entries, Filtered to 1 bot(s)"
echo "  Test 2: Received 3 log entries, Filtered to 3 bot(s)"
echo "  Test 3: Received 29 log entries, Filtered to 29 bot(s)"
echo "======================================"
