/**
 * Resilient API client with retry, timeout, rate limiting, and error classification.
 * Loaded via importScripts() in background.js.
 *
 * Depends on: lib/errors.js (TKError, ApiError, RateLimitError, TimeoutError, NetworkError)
 */

const ApiClient = {
  /**
   * Perform a fetch request with automatic retry and timeout.
   *
   * @param {string} url
   * @param {RequestInit} options - Standard fetch options
   * @param {object} [config]
   * @param {number} [config.timeoutMs=30000] - Request timeout in ms
   * @param {number} [config.maxRetries=2] - Max retry attempts (0 = no retries)
   * @param {number} [config.baseDelayMs=1000] - Base delay for exponential backoff
   * @param {string} [config.provider] - Provider ID for error context
   * @param {boolean} [config.retryOn429=true] - Retry on 429 (rate limit)
   * @param {boolean} [config.retryOnNetwork=true] - Retry on network errors
   * @returns {Promise<Response>}
   */
  async fetch(url, options, config = {}) {
    const {
      timeoutMs = 30000,
      maxRetries = 2,
      baseDelayMs = 1000,
      provider = '',
      retryOn429 = true,
      retryOnNetwork = true,
    } = config;

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this._fetchWithTimeout(url, options, timeoutMs);

        // Rate limit handling
        if (response.status === 429) {
          const retryAfter = this._parseRetryAfter(response);
          lastError = new RateLimitError(
            `Rate limited by ${provider || 'API'} (429)`,
            retryAfter,
            provider
          );

          if (retryOn429 && attempt < maxRetries) {
            const delay = retryAfter || baseDelayMs * Math.pow(2, attempt);
            console.warn(`[ApiClient] 429 from ${provider}, retry in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await this._sleep(delay);
            continue;
          }
          throw lastError;
        }

        // Server errors (5xx) — retryable
        if (response.status >= 500 && attempt < maxRetries) {
          const body = await response.text();
          lastError = new ApiError(
            `Server error ${response.status} from ${provider || 'API'}`,
            response.status,
            provider,
            body
          );
          const delay = baseDelayMs * Math.pow(2, attempt);
          console.warn(`[ApiClient] ${response.status} from ${provider}, retry in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this._sleep(delay);
          continue;
        }

        // Client errors (4xx, non-429) — not retryable
        if (!response.ok) {
          const body = await response.text();
          throw new ApiError(
            this._humanizeHttpError(response.status, body, provider),
            response.status,
            provider,
            body
          );
        }

        return response;
      } catch (err) {
        // Already a TKError — rethrow or retry
        if (err instanceof TKError) {
          lastError = err;
          if (err instanceof TimeoutError || err instanceof NetworkError) {
            if (retryOnNetwork && attempt < maxRetries) {
              const delay = baseDelayMs * Math.pow(2, attempt);
              console.warn(`[ApiClient] ${err.name} for ${provider}, retry in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
              await this._sleep(delay);
              continue;
            }
          }
          throw err;
        }

        // Native fetch errors (TypeError = network issue)
        if (err instanceof TypeError || err.name === 'AbortError') {
          lastError = err.name === 'AbortError'
            ? new TimeoutError(`Request to ${provider || 'API'} timed out after ${timeoutMs}ms`, timeoutMs)
            : new NetworkError(`Network error connecting to ${provider || 'API'}: ${err.message}`, err);

          if (retryOnNetwork && attempt < maxRetries) {
            const delay = baseDelayMs * Math.pow(2, attempt);
            console.warn(`[ApiClient] Network error for ${provider}, retry in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await this._sleep(delay);
            continue;
          }
          throw lastError;
        }

        throw err;
      }
    }

    throw lastError || new TKError('Max retries exhausted', 'MAX_RETRIES', { provider });
  },

  /**
   * Convenience: fetch + parse JSON response.
   * @param {string} url
   * @param {RequestInit} options
   * @param {object} [config] - Same as fetch() config
   * @returns {Promise<any>}
   */
  async fetchJSON(url, options, config = {}) {
    const response = await this.fetch(url, options, config);
    try {
      return await response.json();
    } catch (err) {
      const text = await response.text().catch(() => '');
      throw new ParseError(`Failed to parse JSON from ${config.provider || 'API'}: ${err.message}`, text);
    }
  },

  // ── Internal Helpers ──────────────────────────────────────────────────────

  /**
   * @param {string} url
   * @param {RequestInit} options
   * @param {number} timeoutMs
   * @returns {Promise<Response>}
   */
  _fetchWithTimeout(url, options, timeoutMs) {
    if (timeoutMs <= 0 || timeoutMs > 300000) {
      return fetch(url, options);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const mergedOptions = { ...options, signal: controller.signal };

    return fetch(url, mergedOptions).finally(() => clearTimeout(timer));
  },

  /**
   * Parse Retry-After header (seconds or date).
   * @param {Response} response
   * @returns {number} Milliseconds to wait, or 0 if not parseable
   */
  _parseRetryAfter(response) {
    const header = response.headers.get('Retry-After');
    if (!header) return 0;

    const seconds = parseInt(header, 10);
    if (!isNaN(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 60000);
    }

    const date = Date.parse(header);
    if (!isNaN(date)) {
      const ms = date - Date.now();
      return ms > 0 ? Math.min(ms, 60000) : 0;
    }

    return 0;
  },

  /**
   * Convert HTTP status + body into a human-readable Russian error message.
   * @param {number} status
   * @param {string} body
   * @param {string} provider
   * @returns {string}
   */
  _humanizeHttpError(status, body, provider) {
    const providerLabel = provider || 'API';
    const bodyPreview = String(body || '').slice(0, 200);

    // Try to extract error message from JSON body
    let parsed = null;
    try { parsed = JSON.parse(body); } catch (_) {}
    const innerMsg = parsed && (
      (parsed.error && (parsed.error.message || parsed.error.msg)) ||
      parsed.message ||
      parsed.msg ||
      parsed.detail
    );

    // Google API geo-restriction
    if (status === 400 && /location is not supported|FAILED_PRECONDITION/i.test(bodyPreview)) {
      return `⛔ Google API недоступен из вашего региона. Включите VPN или смените провайдер на OpenRouter / kie.ai.`;
    }

    if (status === 400 && innerMsg) return `Ошибка запроса к ${providerLabel}: ${innerMsg}`;
    if (status === 401) return `Неверный API-ключ для ${providerLabel}. Проверьте настройки.`;
    if (status === 403) return `Доступ запрещён к ${providerLabel}. Проверьте права ключа.`;
    if (status === 404) return `Модель или endpoint не найден у ${providerLabel}.`;
    if (status === 422) return `Некорректный запрос к ${providerLabel}: ${innerMsg || bodyPreview}`;
    if (status === 429) return `Превышен лимит запросов к ${providerLabel}. Подождите и попробуйте снова.`;
    if (status >= 500) return `Сервер ${providerLabel} временно недоступен (${status}). Попробуйте позже.`;

    return `Ошибка ${status} от ${providerLabel}: ${innerMsg || bodyPreview}`;
  },

  /** @param {number} ms */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};
