/**
 * Vercel Log Drain webhook payload types
 * Reference: https://vercel.com/docs/drains/reference/logs
 */

export interface VercelLogEntry {
  id: string;
  deploymentId: string;
  projectId: string;
  timestamp: number; // Unix timestamp in milliseconds
  source: 'build' | 'edge' | 'lambda' | 'static' | 'external' | 'firewall' | 'redirect';
  level: 'info' | 'warning' | 'error' | 'fatal';
  message?: string;
  environment?: 'production' | 'preview';
  proxy?: ProxyObject;
}

export interface ProxyObject {
  timestamp: number;
  method: string;
  host: string;
  path: string;
  userAgent: string | string[]; // IMPORTANT: Can be string OR array
  region: string;
  statusCode?: number;
  clientIp?: string;
  referer?: string;
  scheme?: string;
  responseByteSize?: number;
  vercelCache?: 'MISS' | 'HIT' | 'STALE' | 'BYPASS' | 'PRERENDER' | 'REVALIDATED';
  wafAction?: 'log' | 'challenge' | 'deny' | 'bypass' | 'rate_limit';
}
