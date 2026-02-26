/**
 * Error logging to chrome.storage for user debugging.
 * Stores last N errors so users can report issues with context.
 * Loaded via importScripts() in background.js.
 */

const ErrorLog = {
  STORAGE_KEY: 'tilda_flows_error_log',
  MAX_ENTRIES: 50,

  /**
   * Log an error with context.
   * @param {string} source - Where the error occurred (e.g. 'generateText', 'generateImage')
   * @param {Error|TKError} error
   * @param {object} [context] - Additional context (prompt preview, provider, etc.)
   */
  async log(source, error, context) {
    try {
      const entry = {
        ts: Date.now(),
        date: new Date().toISOString(),
        source: String(source || 'unknown'),
        name: error.name || 'Error',
        code: error.code || '',
        message: String(error.message || '').slice(0, 500),
        provider: error.provider || (context && context.provider) || '',
        status: error.status || 0,
        context: context ? this._sanitizeContext(context) : undefined,
      };

      const data = await this._getLog();
      data.unshift(entry);
      if (data.length > this.MAX_ENTRIES) data.length = this.MAX_ENTRIES;

      await new Promise((resolve) => {
        chrome.storage.local.set({ [this.STORAGE_KEY]: data }, resolve);
      });
    } catch (_) {
      // Never let logging itself break the flow
    }
  },

  /**
   * Get stored error log.
   * @returns {Promise<Array>}
   */
  async getLog() {
    return this._getLog();
  },

  /**
   * Clear the error log.
   * @returns {Promise<void>}
   */
  async clear() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: [] }, resolve);
    });
  },

  /** @returns {Promise<Array>} */
  async _getLog() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.STORAGE_KEY], (r) => {
        resolve(Array.isArray(r[this.STORAGE_KEY]) ? r[this.STORAGE_KEY] : []);
      });
    });
  },

  /**
   * Strip sensitive data (API keys, full prompts) from context before storing.
   * @param {object} ctx
   * @returns {object}
   */
  _sanitizeContext(ctx) {
    const safe = {};
    for (const [key, value] of Object.entries(ctx)) {
      if (/key|token|secret|password|auth/i.test(key)) continue;
      if (typeof value === 'string' && value.length > 200) {
        safe[key] = value.slice(0, 200) + '…';
      } else {
        safe[key] = value;
      }
    }
    return safe;
  },
};
