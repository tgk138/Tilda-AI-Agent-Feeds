/**
 * Structured error classes for the extension.
 * Loaded via importScripts() in background.js.
 */

class TKError extends Error {
  /**
   * @param {string} message
   * @param {string} code - Machine-readable error code
   * @param {object} [details] - Extra context
   */
  constructor(message, code, details) {
    super(message);
    this.name = 'TKError';
    this.code = code;
    this.details = details || {};
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

class ApiError extends TKError {
  /**
   * @param {string} message
   * @param {number} status - HTTP status code
   * @param {string} [provider] - Provider ID
   * @param {string} [responseBody] - Raw response body
   */
  constructor(message, status, provider, responseBody) {
    super(message, 'API_ERROR', { status, provider, responseBody });
    this.name = 'ApiError';
    this.status = status;
    this.provider = provider || '';
  }
}

class RateLimitError extends TKError {
  /**
   * @param {string} message
   * @param {number} [retryAfterMs] - Milliseconds to wait before retrying
   * @param {string} [provider]
   */
  constructor(message, retryAfterMs, provider) {
    super(message, 'RATE_LIMIT', { retryAfterMs, provider });
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs || 0;
  }
}

class ParseError extends TKError {
  /**
   * @param {string} message
   * @param {string} rawContent - The raw string that failed to parse
   */
  constructor(message, rawContent) {
    super(message, 'PARSE_ERROR', { rawContentPreview: String(rawContent || '').slice(0, 500) });
    this.name = 'ParseError';
    this.rawContent = rawContent || '';
  }
}

class TimeoutError extends TKError {
  /**
   * @param {string} message
   * @param {number} timeoutMs
   */
  constructor(message, timeoutMs) {
    super(message, 'TIMEOUT', { timeoutMs });
    this.name = 'TimeoutError';
  }
}

class NetworkError extends TKError {
  /**
   * @param {string} message
   * @param {Error} [cause]
   */
  constructor(message, cause) {
    super(message, 'NETWORK_ERROR', { cause: cause ? cause.message : undefined });
    this.name = 'NetworkError';
  }
}
