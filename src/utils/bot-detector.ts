/**
 * Bot detection and categorization logic
 */

import { BotCategory } from '../types/bigquery.types';

export interface BotDetectionResult {
  isBot: boolean;
  botName: string | null;
  botCategory: BotCategory;
}

// Bot patterns with case-insensitive regex matching
// Updated to detect 33 LLM and web crawler bots
const BOT_PATTERNS: Record<string, { regex: RegExp; category: BotCategory }> = {
  // OpenAI (3 bots)
  GPTBot: { regex: /gptbot/i, category: 'OpenAI' },
  'ChatGPT-User': { regex: /chatgpt-user/i, category: 'OpenAI' },
  'ChatGPT-PageFetcher': { regex: /chatgpt.*pagefetcher/i, category: 'OpenAI' },

  // Anthropic (2 bots)
  ClaudeBot: { regex: /claudebot/i, category: 'Anthropic' },
  'Anthropic-AI': { regex: /anthropic-ai/i, category: 'Anthropic' },

  // Google (3 bots)
  'Google-Extended': { regex: /google-extended/i, category: 'Google' },
  GoogleOther: { regex: /googleother(?!-image)/i, category: 'Google' },
  'GoogleOther-Image': { regex: /googleother-image/i, category: 'Google' },

  // Perplexity (3 bots)
  PerplexityBot: { regex: /perplexitybot/i, category: 'Perplexity' },
  'Perplexity-User': { regex: /perplexity-user/i, category: 'Perplexity' },
  'PPLX-Agent': { regex: /pplx.*agent/i, category: 'Perplexity' },

  // CommonCrawl (1 bot)
  CCBot: { regex: /ccbot/i, category: 'CommonCrawl' },

  // ByteDance (1 bot)
  Bytespider: { regex: /bytespider/i, category: 'ByteDance' },

  // Diffbot (2 bots)
  Diffbot: { regex: /diffbot(?!bot)/i, category: 'Diffbot' },
  DiffbotBot: { regex: /diffbotbot/i, category: 'Diffbot' },

  // You.com (1 bot)
  YouBot: { regex: /youbot/i, category: 'You.com' },

  // Cohere (2 bots)
  'Cohere-AI': { regex: /cohere-ai/i, category: 'Cohere' },
  'Cohere-User-Agent': { regex: /cohere.*user.*agent/i, category: 'Cohere' },

  // Meta (3 bots)
  FacebookBot: { regex: /facebookbot/i, category: 'Meta' },
  'Meta-ExternalFetcher': { regex: /meta.*external.*fetcher/i, category: 'Meta' },
  'Meta-Indexer': { regex: /meta.*indexer/i, category: 'Meta' },

  // ImageSift (1 bot)
  ImagesiftBot: { regex: /imagesiftbot/i, category: 'ImageSift' },

  // Omgili (2 bots - handle both lowercase and capitalized)
  omgili: { regex: /^omgili(?!bot)/i, category: 'Omgili' },
  omgilibot: { regex: /omgilibot/i, category: 'Omgili' },

  // Apple (2 bots)
  Applebot: { regex: /applebot(?!-extended)/i, category: 'Apple' },
  'Applebot-Extended': { regex: /applebot-extended/i, category: 'Apple' },

  // Neeva (1 bot)
  NeevaBot: { regex: /neevabot/i, category: 'Neeva' },

  // SMT (1 bot)
  SMTBot: { regex: /smtbot/i, category: 'SMT' },

  // LAION (1 pattern matching variants)
  'LAION-crawler': { regex: /laion.*crawler/i, category: 'LAION' },
};

/**
 * Detects if user agent is an LLM bot and categorizes it
 * Handles both string and array user agent formats
 */
export function detectBot(userAgent: string | string[] | undefined): BotDetectionResult {
  if (!userAgent) {
    return { isBot: false, botName: null, botCategory: 'Unknown' };
  }

  // Handle array of user agents - join with space
  const userAgentString = Array.isArray(userAgent)
    ? userAgent.join(' ')
    : userAgent;

  // Check each bot pattern
  for (const [botName, { regex, category }] of Object.entries(BOT_PATTERNS)) {
    if (regex.test(userAgentString)) {
      return {
        isBot: true,
        botName,
        botCategory: category,
      };
    }
  }

  return { isBot: false, botName: null, botCategory: 'Unknown' };
}
