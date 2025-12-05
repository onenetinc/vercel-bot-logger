/**
 * BigQuery schema types for bot traffic table
 * Updated schema with 32 fields to capture comprehensive log data
 */

export type BotCategory =
  | 'OpenAI'
  | 'Anthropic'
  | 'Google'
  | 'Perplexity'
  | 'CommonCrawl'
  | 'ByteDance'
  | 'Diffbot'
  | 'You.com'
  | 'Cohere'
  | 'Meta'
  | 'ImageSift'
  | 'Omgili'
  | 'Apple'
  | 'Neeva'
  | 'SMT'
  | 'LAION'
  | 'Unknown';

export interface BotLogRow {
  // Core identifiers
  log_id: string;                    // Vercel log entry ID
  request_id: string | null;         // Request identifier for tracing
  trace_id: string | null;           // Distributed tracing ID
  span_id: string | null;            // Span ID for distributed tracing

  // Timestamps
  timestamp: string;                 // ISO 8601 timestamp (from log.timestamp)
  date: string;                      // YYYY-MM-DD (derived from timestamp)
  hour: number;                      // 0-23 (derived from timestamp)
  proxy_timestamp: string | null;    // ISO 8601 timestamp from proxy
  processed_at: string;              // When log was processed by function

  // Bot detection
  bot_name: string;                  // Detected bot user agent
  bot_category: BotCategory;         // Categorized bot type
  full_user_agent: string;           // Complete user agent string

  // HTTP request details
  method: string;                    // HTTP method (from proxy)
  path: string | null;               // Top-level path (from log.path)
  proxy_path: string;                // Proxy-level path with query params
  host: string;                      // Request hostname (from proxy)
  proxy_scheme: string | null;       // HTTP/HTTPS scheme
  proxy_referer: string | null;      // Referer header

  // Deployment context
  deployment_id: string;             // Vercel deployment ID
  project_id: string;                // Vercel project ID
  source: string;                    // Log source (build, edge, lambda, static, etc.)
  entrypoint: string | null;         // Function entry point
  environment: string | null;        // production or preview

  // Response details
  status_code: number | null;        // Top-level HTTP status code
  proxy_status_code: number | null;  // Proxy-level HTTP status code
  level: string;                     // Log level (debug, info, warn, error)

  // Network & performance
  client_ip: string | null;          // Client IP address
  region: string;                    // Proxy processing region (e.g., sfo1)
  execution_region: string | null;   // Execution region (from log.executionRegion)

  // Caching
  cache_status: string | null;       // Vercel cache status (MISS, HIT, etc.)
  cache_id: string | null;           // Cache identifier

  // Security (WAF)
  waf_action: string | null;         // WAF action (log, challenge, deny, bypass, rate_limit)
  waf_rule: string | null;           // WAF rule ID that matched

  // Additional metadata
  raw_message: string | null;        // Raw log message content
}
