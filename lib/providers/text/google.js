/**
 * Google Gemini Official Text Provider — direct access to Gemini models.
 * Uses the OpenAI-compatible endpoint for chat completions.
 */

class GoogleTextProvider extends BaseTextProvider {
  get id() { return TEXT_PROVIDERS.GOOGLE; }
  get name() { return 'Google Gemini (Official)'; }

  getModels() {
    return [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    ];
  }

  _buildBody(messages, options = {}) {
    const body = {
      model: options.model || DEFAULT_MODELS[TEXT_PROVIDERS.GOOGLE],
      messages: messages.map((m) => ({
        role: m.role,
        content: [{ type: 'text', text: m.content }],
      })),
      stream: !!options.stream,
    };

    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    if (options.useWebSearch) {
      body.tools = [{ type: 'function', function: { name: 'googleSearch' } }];
    }

    return body;
  }

  async chat(apiKey, messages, options = {}) {
    const body = this._buildBody(messages, { ...options, stream: false });

    const res = await fetch(API_URLS.GOOGLE_OPENAI_COMPAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return extractChatContent(data);
  }

  async chatStream(apiKey, messages, options = {}) {
    const body = this._buildBody(messages, { ...options, stream: true });

    const res = await fetch(API_URLS.GOOGLE_OPENAI_COMPAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    return parseSSEStream(res, options.onChunk);
  }

  async checkKey(apiKey, model) {
    try {
      const result = await this.chat(
        apiKey,
        [{ role: 'user', content: 'Say OK' }],
        { model: model || DEFAULT_MODELS[TEXT_PROVIDERS.GOOGLE] }
      );
      return { valid: !!result, error: result ? undefined : 'Empty response' };
    } catch (err) {
      return { valid: false, error: err.message || String(err) };
    }
  }
}
