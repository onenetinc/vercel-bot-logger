/**
 * Transform Vercel log entries to BigQuery schema
 */

import { VercelLogEntry } from '../types/vercel.types';
import { BotLogRow } from '../types/bigquery.types';
import { detectBot } from './bot-detector';

/**
 * Transforms a Vercel log entry into BigQuery schema format (32 fields)
 * Returns null if:
 * - Log has no proxy data (not an HTTP request)
 * - User agent is not a bot
 */
export function transformLogToBigQuery(log: VercelLogEntry): BotLogRow | null {
  // Skip logs without proxy data (no HTTP request data)
  if (!log.proxy) {
    return null;
  }

  const { proxy } = log;

  // Detect bot
  const botDetection = detectBot(proxy.userAgent);

  // Skip non-bot traffic
  if (!botDetection.isBot) {
    return null;
  }

  // Create timestamp components from log.timestamp
  const logTimestamp = new Date(log.timestamp);
  const isoTimestamp = logTimestamp.toISOString();
  const date = isoTimestamp.split('T')[0]; // YYYY-MM-DD
  const hour = logTimestamp.getUTCHours();

  // Create proxy timestamp
  const proxyTimestamp = proxy.timestamp ? new Date(proxy.timestamp).toISOString() : null;

  // Get user agent string (handle array format)
  const fullUserAgent = Array.isArray(proxy.userAgent)
    ? proxy.userAgent.join(' ')
    : proxy.userAgent;

  // Current processing timestamp
  const processedAt = new Date().toISOString();

  return {
    // Core identifiers
    log_id: log.id,
    request_id: log.requestId ?? null,
    trace_id: log.traceId ?? null,
    span_id: log.spanId ?? null,

    // Timestamps
    timestamp: isoTimestamp,
    date,
    hour,
    proxy_timestamp: proxyTimestamp,
    processed_at: processedAt,

    // Bot detection
    bot_name: botDetection.botName!,
    bot_category: botDetection.botCategory,
    full_user_agent: fullUserAgent,

    // HTTP request details
    method: proxy.method,
    path: log.path ?? null,           // Top-level path
    proxy_path: proxy.path,            // Proxy path with query params
    host: proxy.host,
    proxy_scheme: proxy.scheme ?? null,
    proxy_referer: proxy.referer ?? null,

    // Deployment context
    deployment_id: log.deploymentId,
    project_id: log.projectId,
    source: log.source,
    entrypoint: log.entrypoint ?? null,
    environment: log.environment ?? null,

    // Response details
    status_code: log.statusCode ?? null,        // Top-level status
    proxy_status_code: proxy.statusCode ?? null, // Proxy status
    level: log.level,

    // Network & performance
    client_ip: proxy.clientIp ?? null,
    region: proxy.region,
    execution_region: log.executionRegion ?? null,

    // Caching
    cache_status: proxy.vercelCache ?? null,
    cache_id: proxy.cacheId ?? null,

    // Security (WAF)
    waf_action: proxy.wafAction ?? null,
    waf_rule: proxy.wafRuleId ?? null,

    // Additional metadata
    raw_message: log.message ?? null,
  };
}
