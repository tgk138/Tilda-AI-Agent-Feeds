/**
 * OpenAI Text Provider — direct access to GPT-4o, o1, etc.
 */

class OpenAITextProvider extends BaseTextProvider {
  get id() { return TEXT_PROVIDERS.OPENAI; }
  get name() { return 'OpenAI'; }

  getModels() {
    return [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'o3-mini', name: 'o3 Mini' },
    ];
  }

  _buildBody(messages, options = {}) {
    const body = {
      model: options.model || DEFAULT_MODELS[TEXT_PROVIDERS.OPENAI],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: !!options.stream,
    };

    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    return body;
  }

  async chat(apiKey, messages, options = {}) {
    const body = this._buildBody(messages, { ...options, stream: false });

    const res = await fetch(API_URLS.OPENAI_CHAT, {
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

    const res = await fetch(API_URLS.OPENAI_CHAT, {
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
        { model: model || DEFAULT_MODELS[TEXT_PROVIDERS.OPENAI] }
      );
      return { valid: !!result, error: result ? undefined : 'Empty response' };
    } catch (err) {
      return { valid: false, error: err.message || String(err) };
    }
  }
}
