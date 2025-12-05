/**
 * Vercel Log Drain webhook payload types
 * Reference: https://vercel.com/docs/drains/reference/logs
 * Updated with complete field set from official documentation
 */

export interface VercelLogEntry {
  // Core identifiers
  id: string;
  deploymentId: string;
  projectId: string;

  // Source and classification
  timestamp: number; // Unix timestamp in milliseconds
  source: 'build' | 'edge' | 'lambda' | 'static' | 'external' | 'firewall' | 'redirect';
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  host: string;

  // Optional fields
  message?: string;
  environment?: 'production' | 'preview';
  buildId?: string;
  entrypoint?: string;
  destination?: string;
  path?: string;
  type?: string;
  statusCode?: number;
  requestId?: string;
  branch?: string;
  ja3Digest?: string;
  ja4Digest?: string;
  edgeType?: 'edge-function' | 'middleware';
  projectName?: string;
  executionRegion?: string;
  traceId?: string;
  spanId?: string;

  // Proxy object (contains HTTP request details)
  proxy?: ProxyObject;
}

export interface ProxyObject {
  // Required when proxy is present
  timestamp: number;
  method: string;
  host: string;
  path: string;
  userAgent: string | string[]; // IMPORTANT: Can be string OR array
  region: string;

  // Optional proxy fields
  referer?: string;
  statusCode?: number;
  clientIp?: string;
  scheme?: string;
  responseByteSize?: number;
  cacheId?: string;
  pathType?: string;
  pathTypeVariant?: string;
  vercelId?: string;
  vercelCache?: 'MISS' | 'HIT' | 'STALE' | 'BYPASS' | 'PRERENDER' | 'REVALIDATED';
  lambdaRegion?: string;
  wafAction?: 'log' | 'challenge' | 'deny' | 'bypass' | 'rate_limit';
  wafRuleId?: string;
}
