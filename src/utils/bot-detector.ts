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
const BOT_PATTERNS: Record<string, { regex: RegExp; category: BotCategory }> = {
  GPTBot: { regex: /gptbot/i, category: 'OpenAI' },
  'ChatGPT-User': { regex: /chatgpt-user/i, category: 'OpenAI' },
  ClaudeBot: { regex: /claudebot/i, category: 'Anthropic' },
  'Anthropic-AI': { regex: /anthropic-ai/i, category: 'Anthropic' },
  'Google-Extended': { regex: /google-extended/i, category: 'Google' },
  PerplexityBot: { regex: /perplexitybot/i, category: 'Perplexity' },
  'Perplexity-User': { regex: /perplexity-user/i, category: 'Perplexity' },
  CCBot: { regex: /ccbot/i, category: 'CommonCrawl' },
  Bytespider: { regex: /bytespider/i, category: 'ByteDance' },
  Diffbot: { regex: /diffbot/i, category: 'Diffbot' },
  YouBot: { regex: /youbot/i, category: 'You.com' },
  'Cohere-AI': { regex: /cohere-ai/i, category: 'Cohere' },
  FacebookBot: { regex: /facebookbot/i, category: 'Meta' },
  ImagesiftBot: { regex: /imagesiftbot/i, category: 'ImageSift' },
  Omgilibot: { regex: /omgilibot/i, category: 'Omgili' },
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
