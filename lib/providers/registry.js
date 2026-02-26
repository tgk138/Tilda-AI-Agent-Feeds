/**
 * Provider Registry — factory for text and media providers.
 * Loaded via importScripts() in background.js after all provider files.
 */

const ProviderRegistry = {
  _textProviders: {},
  _mediaProviders: {},

  /** Register a text provider instance. */
  registerText(provider) {
    this._textProviders[provider.id] = provider;
  },

  /** Register a media provider instance. */
  registerMedia(provider) {
    this._mediaProviders[provider.id] = provider;
  },

  /**
   * Get a text provider by ID.
   * @param {string} id
   * @returns {BaseTextProvider}
   */
  getText(id) {
    const provider = this._textProviders[id];
    if (!provider) {
      console.warn(`[ProviderRegistry] Unknown text provider: ${id}, falling back to kie`);
      return this._textProviders[TEXT_PROVIDERS.KIE];
    }
    return provider;
  },

  /**
   * Get a media provider by ID.
   * @param {string} id
   * @returns {BaseMediaProvider}
   */
  getMedia(id) {
    const provider = this._mediaProviders[id];
    if (!provider) {
      console.warn(`[ProviderRegistry] Unknown media provider: ${id}, falling back to kie-banana`);
      return this._mediaProviders[MEDIA_PROVIDERS.KIE_BANANA];
    }
    return provider;
  },

  /** @returns {{id: string, name: string, models: {id: string, name: string}[]}[]} */
  listTextProviders() {
    return Object.values(this._textProviders).map((p) => ({
      id: p.id,
      name: p.name,
      models: p.getModels(),
    }));
  },

  /** @returns {{id: string, name: string, models: {id: string, name: string, requiresInputUrls?: boolean}[]}[]} */
  listMediaProviders() {
    return Object.values(this._mediaProviders).map((p) => ({
      id: p.id,
      name: p.name,
      models: p.getModels(),
    }));
  },

  /** Initialize all built-in providers. Called once on extension load. */
  init() {
    // Text providers
    this.registerText(new KieTextProvider());
    this.registerText(new GoogleTextProvider());
    this.registerText(new OpenRouterTextProvider());
    this.registerText(new OpenAITextProvider());
    this.registerText(new AnthropicTextProvider());

    // Media providers
    this.registerMedia(new KieBananaMediaProvider());
    this.registerMedia(new KieGptImageMediaProvider());
    this.registerMedia(new GoogleImagenMediaProvider());
    this.registerMedia(new GptImageMediaProvider());

    console.log(
      '[ProviderRegistry] Initialized:',
      Object.keys(this._textProviders).length, 'text,',
      Object.keys(this._mediaProviders).length, 'media providers'
    );
  },
};
