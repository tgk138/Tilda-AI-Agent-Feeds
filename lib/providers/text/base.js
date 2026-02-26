/**
 * Base Text Provider — interface contract for all text providers.
 * Each provider must implement: id, name, chat(), chatStream(), checkKey(), getModels().
 *
 * Shared helpers for parsing SSE streams and JSON responses are also here.
 */

class BaseTextProvider {
  /** @returns {string} Unique provider ID (matches TEXT_PROVIDERS constant) */
  get id() { throw new Error('Not implemented'); }

  /** @returns {string} Human-readable name */
  get name() { throw new Error('Not implemented'); }

  /**
   * Non-streaming chat completion.
   * @param {string} apiKey
   * @param {{role: string, content: string}[]} messages
   * @param {object} [options]
   * @param {string} [options.model]
   * @param {boolean} [options.jsonMode] - Request JSON output
   * @param {string} [options.reasoningEffort] - 'low' | 'medium' | 'high'
   * @returns {Promise<string>} Response text
   */
  async chat(_apiKey, _messages, _options) {
    throw new Error('Not implemented');
  }

  /**
   * Streaming chat completion.
   * @param {string} apiKey
   * @param {{role: string, content: string}[]} messages
   * @param {object} [options]
   * @param {string} [options.model]
   * @param {function} [options.onChunk] - Called with each text chunk
   * @param {boolean} [options.useWebSearch] - Enable web search tool
   * @returns {Promise<string>} Full accumulated text
   */
  async chatStream(_apiKey, _messages, _options) {
    throw new Error('Not implemented');
  }

  /**
   * Validate API key by making a minimal request.
   * @param {string} apiKey
   * @param {string} [model]
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async checkKey(_apiKey, _model) {
    throw new Error('Not implemented');
  }

  /**
   * Get available models for this provider.
   * @returns {{id: string, name: string}[]}
   */
  getModels() {
    return [];
  }
}

// ── Shared SSE Stream Parser ────────────────────────────────────────────────────

/**
 * Parse an SSE stream from an OpenAI-compatible chat completions endpoint.
 * @param {Response} response - fetch Response
 * @param {function} [onChunk] - Called with each text delta
 * @returns {Promise<string>} Full accumulated content
 */
async function parseSSEStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return fullContent;
        try {
          const json = JSON.parse(data);
          const choice = json.choices && json.choices[0];
          if (!choice || !choice.delta) continue;
          if (choice.delta.content != null && choice.delta.content !== '') {
            fullContent += choice.delta.content;
            if (typeof onChunk === 'function') onChunk(choice.delta.content);
          }
          if (choice.finish_reason === 'stop') return fullContent;
        } catch (_) {}
      }
    }
  }

  return fullContent;
}

/**
 * Extract text content from an OpenAI-compatible non-streaming response.
 * Handles both string content and array-of-parts content.
 * @param {object} data - Parsed JSON response
 * @returns {string}
 */
function extractChatContent(data) {
  let content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p) => p && (p.type === 'text' || typeof p.text === 'string'))
      .map((p) => (typeof p.text === 'string' ? p.text : ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

/**
 * Clean markdown code fences and trailing commas from JSON response.
 * @param {string} raw
 * @returns {object}
 */
function parseAIJson(raw) {
  let cleaned = String(raw || '').trim().replace(/^```(?:json)?\s*|\s*```$/gi, '');
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(cleaned);
  }
}
