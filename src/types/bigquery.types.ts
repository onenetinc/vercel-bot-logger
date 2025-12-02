/**
 * BigQuery schema types for bot traffic table
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
  | 'Unknown';

export interface BotLogRow {
  log_id: string;              // Vercel log entry ID
  timestamp: string;           // ISO 8601 timestamp
  date: string;                // YYYY-MM-DD
  hour: number;                // 0-23
  bot_name: string;            // Detected bot user agent
  bot_category: BotCategory;   // Categorized bot type
  full_user_agent: string;     // Complete user agent string
  method: string;              // HTTP method
  path: string;                // Request path with query params
  host: string;                // Request hostname
  status_code: number | null;  // HTTP status code
  client_ip: string | null;    // Client IP address
  region: string;              // Processing region (e.g., sfo1)
  cache_status: string | null; // Vercel cache status
  referer: string | null;      // Referrer header
  response_size: number | null; // Response bytes
  deployment_id: string;       // Vercel deployment ID
  project_id: string;          // Vercel project ID
  environment: string;         // production or preview
}
