/**
 * Single source of truth for storage keys, API endpoints, and provider configs.
 * Loaded via importScripts() in background.js and referenced in content/popup scripts.
 */

// ── Storage Keys ────────────────────────────────────────────────────────────────
const SK = Object.freeze({
  // Text provider
  TEXT_PROVIDER: 'tilda_flows_text_provider',
  TEXT_API_KEY: 'tilda_flows_text_api_key',
  TEXT_MODEL: 'tilda_flows_text_model',

  // Media provider
  MEDIA_PROVIDER: 'tilda_flows_media_provider',
  MEDIA_API_KEY: 'tilda_flows_media_api_key',
  MEDIA_MODEL: 'tilda_flows_media_model',

  // Legacy keys (for migration)
  LEGACY_API_KEY: 'tilda_flows_api_key',
  LEGACY_PROVIDER: 'tilda_flows_api_provider',
  LEGACY_OFFICIAL_KEY: 'tilda_flows_official_gemini_api_key',

  // Wordstat
  WORDSTAT_API_KEY: 'tilda_flows_wordstat_api_key',
  WORDSTAT_REPORTS: 'tilda_flows_wordstat_reports',
  WORDSTAT_REGIONS_TREE: 'tilda_flows_wordstat_regions_tree',

  // Author
  AUTHOR_NAME: 'tilda_flows_author_name',
  AUTHOR_LINK: 'tilda_flows_author_link',

  // Content settings
  BRAND_KNOWLEDGE: 'tilda_flows_brand_knowledge',
  TONE_OF_VOICE: 'tilda_flows_tone_of_voice',
  CUSTOM_FOOTER: 'tilda_flows_custom_footer',

  // History & presets
  HISTORY: 'tilda_flows_history',
  COVER_PRESETS: 'tilda_flows_cover_presets',
  COVER_PRESET_LAST: 'tilda_flows_cover_preset_last',
  TEXT_PRESETS: 'tilda_flows_text_presets',
  TEXT_PRESET_LAST: 'tilda_flows_text_preset_last',
});

const STORAGE_KEYS_ALL = [
  SK.TEXT_PROVIDER, SK.TEXT_API_KEY, SK.TEXT_MODEL,
  SK.MEDIA_PROVIDER, SK.MEDIA_API_KEY, SK.MEDIA_MODEL,
  SK.LEGACY_API_KEY, SK.LEGACY_PROVIDER, SK.LEGACY_OFFICIAL_KEY,
  SK.WORDSTAT_API_KEY,
  SK.AUTHOR_NAME, SK.AUTHOR_LINK,
  SK.BRAND_KNOWLEDGE, SK.TONE_OF_VOICE, SK.CUSTOM_FOOTER,
  SK.HISTORY,
];

// ── Tone of Voice Map ───────────────────────────────────────────────────────────
const TONE_MAP = Object.freeze({
  default: 'Экспертный, информативный, сбалансированный.',
  official: 'Официально-деловой, строгий, B2B, без сленга.',
  friendly: 'Дружелюбный, неформальный, обращающийся на "ты", как к другу.',
  clickbait: 'Кликбейтный, эмоциональный, интригующий, заставляющий дочитать до конца.',
  educational: 'Обучающий, пошаговый, разжевывающий сложные вещи простым языком.',
  selling: 'Продающий, с фокусом на выгоды, преимущества и призыв к действию (AIDA/PAS).',
});

// ── Provider IDs ────────────────────────────────────────────────────────────────
const TEXT_PROVIDERS = Object.freeze({
  KIE: 'kie',
  GOOGLE: 'google',
  OPENROUTER: 'openrouter',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
});

const MEDIA_PROVIDERS = Object.freeze({
  KIE_BANANA: 'kie-banana',
  GOOGLE_IMAGEN: 'google-imagen',
  GPT_IMAGE: 'gpt-image',
  KIE_GPT_IMAGE: 'kie-gpt-image',
});

// ── API Endpoints ───────────────────────────────────────────────────────────────
const API_URLS = Object.freeze({
  KIE_CHAT: 'https://api.kie.ai/gemini-3-pro/v1/chat/completions',
  KIE_JOBS: 'https://api.kie.ai/api/v1/jobs',
  GOOGLE_OPENAI_COMPAT: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  GOOGLE_GENERATE: 'https://generativelanguage.googleapis.com/v1beta/models',
  OPENROUTER_CHAT: 'https://openrouter.ai/api/v1/chat/completions',
  OPENAI_CHAT: 'https://api.openai.com/v1/chat/completions',
  ANTHROPIC_MESSAGES: 'https://api.anthropic.com/v1/messages',
  WORDSTAT: 'https://api.wordstat.yandex.net/v1',
});

// ── Default Models ──────────────────────────────────────────────────────────────
const DEFAULT_MODELS = Object.freeze({
  [TEXT_PROVIDERS.KIE]: 'gemini-3-pro',
  [TEXT_PROVIDERS.GOOGLE]: 'gemini-2.5-flash',
  [TEXT_PROVIDERS.OPENROUTER]: 'google/gemini-2.5-flash',
  [TEXT_PROVIDERS.OPENAI]: 'gpt-4o',
  [TEXT_PROVIDERS.ANTHROPIC]: 'claude-sonnet-4-20250514',
  [MEDIA_PROVIDERS.KIE_BANANA]: 'nano-banana-pro',
  [MEDIA_PROVIDERS.GOOGLE_IMAGEN]: 'gemini-2.0-flash-preview-image-generation',
  [MEDIA_PROVIDERS.GPT_IMAGE]: 'gpt-image-1',
  [MEDIA_PROVIDERS.KIE_GPT_IMAGE]: 'gpt-image/1.5-text-to-image',
});

// ── Wordstat ────────────────────────────────────────────────────────────────────
const WORDSTAT_REPORT_VERSION = 3;

// ── Image Polling ───────────────────────────────────────────────────────────────
const IMAGE_POLL_INTERVAL_MS = 1500;
const IMAGE_POLL_MAX_ATTEMPTS = 120;
