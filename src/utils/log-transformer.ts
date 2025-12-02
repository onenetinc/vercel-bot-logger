/**
 * Transform Vercel log entries to BigQuery schema
 */

import { VercelLogEntry } from '../types/vercel.types';
import { BotLogRow } from '../types/bigquery.types';
import { detectBot } from './bot-detector';

/**
 * Transforms a Vercel log entry into BigQuery schema format
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

  // Create timestamp components
  const timestamp = new Date(log.timestamp);
  const isoTimestamp = timestamp.toISOString();
  const date = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
  const hour = timestamp.getUTCHours();

  // Get user agent string (handle array format)
  const fullUserAgent = Array.isArray(proxy.userAgent)
    ? proxy.userAgent.join(' ')
    : proxy.userAgent;

  return {
    log_id: log.id,
    timestamp: isoTimestamp,
    date,
    hour,
    bot_name: botDetection.botName!,
    bot_category: botDetection.botCategory,
    full_user_agent: fullUserAgent,
    method: proxy.method,
    path: proxy.path,
    host: proxy.host,
    status_code: proxy.statusCode ?? null,
    client_ip: proxy.clientIp ?? null,
    region: proxy.region,
    cache_status: proxy.vercelCache ?? null,
    referer: proxy.referer ?? null,
    response_size: proxy.responseByteSize ?? null,
    deployment_id: log.deploymentId,
    project_id: log.projectId,
    environment: log.environment ?? 'production',
  };
}
