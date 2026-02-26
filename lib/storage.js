/**
 * Typed wrapper over chrome.storage.local with migration support.
 * Loaded via importScripts() in background.js.
 */

const StorageHelper = {
  /**
   * Get multiple values from chrome.storage.local.
   * @param {string[]} keys
   * @returns {Promise<Record<string, any>>}
   */
  get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    });
  },

  /**
   * Set multiple values in chrome.storage.local.
   * @param {Record<string, any>} data
   * @returns {Promise<void>}
   */
  set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => resolve());
    });
  },

  /**
   * Remove keys from chrome.storage.local.
   * @param {string[]} keys
   * @returns {Promise<void>}
   */
  remove(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => resolve());
    });
  },

  // ── Typed Getters ───────────────────────────────────────────────────────────

  /** @returns {Promise<{provider: string, apiKey: string, model: string}>} */
  async getTextConfig() {
    const data = await StorageHelper.get([
      SK.TEXT_PROVIDER, SK.TEXT_API_KEY, SK.TEXT_MODEL,
      SK.LEGACY_PROVIDER, SK.LEGACY_API_KEY, SK.LEGACY_OFFICIAL_KEY,
    ]);

    let provider = data[SK.TEXT_PROVIDER];
    let apiKey = data[SK.TEXT_API_KEY];
    let model = data[SK.TEXT_MODEL];

    // Migration from legacy keys
    if (!provider && data[SK.LEGACY_PROVIDER]) {
      provider = data[SK.LEGACY_PROVIDER] === 'official' ? TEXT_PROVIDERS.GOOGLE : TEXT_PROVIDERS.KIE;
      apiKey = data[SK.LEGACY_PROVIDER] === 'official' ? data[SK.LEGACY_OFFICIAL_KEY] : data[SK.LEGACY_API_KEY];
      // Persist migration
      await StorageHelper.set({
        [SK.TEXT_PROVIDER]: provider,
        [SK.TEXT_API_KEY]: apiKey || '',
        [SK.TEXT_MODEL]: DEFAULT_MODELS[provider] || '',
      });
    }

    return {
      provider: provider || TEXT_PROVIDERS.KIE,
      apiKey: apiKey || '',
      model: model || DEFAULT_MODELS[provider] || DEFAULT_MODELS[TEXT_PROVIDERS.KIE],
    };
  },

  /** @returns {Promise<{provider: string, apiKey: string, model: string}>} */
  async getMediaConfig() {
    const data = await StorageHelper.get([
      SK.MEDIA_PROVIDER, SK.MEDIA_API_KEY, SK.MEDIA_MODEL,
      SK.LEGACY_PROVIDER, SK.LEGACY_API_KEY, SK.LEGACY_OFFICIAL_KEY,
    ]);

    let provider = data[SK.MEDIA_PROVIDER];
    let apiKey = data[SK.MEDIA_API_KEY];
    let model = data[SK.MEDIA_MODEL];

    // Migration from legacy keys
    if (!provider && data[SK.LEGACY_PROVIDER]) {
      if (data[SK.LEGACY_PROVIDER] === 'official') {
        provider = MEDIA_PROVIDERS.GOOGLE_IMAGEN;
        apiKey = data[SK.LEGACY_OFFICIAL_KEY];
      } else {
        provider = MEDIA_PROVIDERS.KIE_BANANA;
        apiKey = data[SK.LEGACY_API_KEY];
      }
      await StorageHelper.set({
        [SK.MEDIA_PROVIDER]: provider,
        [SK.MEDIA_API_KEY]: apiKey || '',
        [SK.MEDIA_MODEL]: DEFAULT_MODELS[provider] || '',
      });
    }

    return {
      provider: provider || MEDIA_PROVIDERS.KIE_BANANA,
      apiKey: apiKey || '',
      model: model || DEFAULT_MODELS[provider] || DEFAULT_MODELS[MEDIA_PROVIDERS.KIE_BANANA],
    };
  },

  /** @returns {Promise<string>} */
  async getWordstatApiKey() {
    const data = await StorageHelper.get([SK.WORDSTAT_API_KEY]);
    return data[SK.WORDSTAT_API_KEY] || '';
  },

  /** @returns {Promise<{name: string, link: string}>} */
  async getAuthor() {
    const data = await StorageHelper.get([SK.AUTHOR_NAME, SK.AUTHOR_LINK]);
    return {
      name: data[SK.AUTHOR_NAME] || '',
      link: data[SK.AUTHOR_LINK] || '',
    };
  },

  /** @returns {Promise<{brandKnowledge: string, toneOfVoice: string, customFooter: string}>} */
  async getContentSettings() {
    const data = await StorageHelper.get([SK.BRAND_KNOWLEDGE, SK.TONE_OF_VOICE, SK.CUSTOM_FOOTER]);
    return {
      brandKnowledge: data[SK.BRAND_KNOWLEDGE] || '',
      toneOfVoice: data[SK.TONE_OF_VOICE] || 'default',
      customFooter: data[SK.CUSTOM_FOOTER] || '',
    };
  },

  /** @returns {Promise<Array>} */
  async getHistory() {
    const data = await StorageHelper.get([SK.HISTORY]);
    return Array.isArray(data[SK.HISTORY]) ? data[SK.HISTORY] : [];
  },

  /**
   * @param {Array} list
   * @returns {Promise<void>}
   */
  async setHistory(list) {
    await StorageHelper.set({ [SK.HISTORY]: list });
  },

  /**
   * Get all storage data needed by content script / popup.
   * @returns {Promise<Record<string, any>>}
   */
  async getAll() {
    return StorageHelper.get(STORAGE_KEYS_ALL);
  },
};
