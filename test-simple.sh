#!/bin/bash

# Simple test with just 3 bots for debugging
# Tests the deployed function at: https://us-central1-dv-open-ai-poc.cloudfunctions.net/vercel-bot-logger

FUNCTION_URL="https://us-central1-dv-open-ai-poc.cloudfunctions.net/vercel-bot-logger"

echo "======================================"
echo "Simple Test - 3 Bots WITHOUT Signature"
echo "URL: $FUNCTION_URL"
echo "======================================"
echo ""

# Test 1: Single bot
echo "Test 1: Single GPTBot"
echo "---------------------"
BODY='{"id":"simple-test-1","timestamp":1702934400000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934400000,"method":"GET","host":"example.vercel.app","path":"/test","userAgent":["GPTBot/1.0"],"region":"sfo1","statusCode":200}}'

echo "Body: $BODY"
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary "$BODY" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# Test 2: Two bots with actual newline
echo "Test 2: Two Bots with Newline"
echo "------------------------------"
BODY='{"id":"simple-test-2","timestamp":1702934401000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934401000,"method":"GET","host":"example.vercel.app","path":"/test2","userAgent":["ClaudeBot/1.0"],"region":"iad1","statusCode":200}}
{"id":"simple-test-3","timestamp":1702934402000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934402000,"method":"GET","host":"example.vercel.app","path":"/test3","userAgent":["PerplexityBot/1.0"],"region":"dfw1","statusCode":200}}'

echo "Body (2 lines):"
echo "$BODY"
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary "$BODY" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# Test 3: Using echo -e with \n
echo "Test 3: Three Bots with echo -e"
echo "--------------------------------"
NDJSON='{"id":"simple-test-4","timestamp":1702934403000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934403000,"method":"GET","host":"example.vercel.app","path":"/test4","userAgent":["GPTBot/1.0"],"region":"sfo1","statusCode":200}}\n{"id":"simple-test-5","timestamp":1702934404000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934404000,"method":"GET","host":"example.vercel.app","path":"/test5","userAgent":["Google-Extended/1.0"],"region":"iad1","statusCode":200}}\n{"id":"simple-test-6","timestamp":1702934405000,"deploymentId":"dpl_test","projectId":"prj_test","source":"edge","level":"info","proxy":{"timestamp":1702934405000,"method":"GET","host":"example.vercel.app","path":"/test6","userAgent":["Bytespider/1.0"],"region":"dfw1","statusCode":200}}'

echo "Body (3 lines with \\n):"
echo -e "$NDJSON"
echo ""

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary "$(echo -e "$NDJSON")" \
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
echo "  Test 2: Received 2 log entries, Filtered to 2 bot(s)"
echo "  Test 3: Received 3 log entries, Filtered to 3 bot(s)"
echo "======================================"
