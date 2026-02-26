/**
 * OpenRouter Text Provider — access to 500+ models via a single API key.
 * OpenAI-compatible API at https://openrouter.ai/api/v1/chat/completions
 */

class OpenRouterTextProvider extends BaseTextProvider {
  get id() { return TEXT_PROVIDERS.OPENROUTER; }
  get name() { return 'OpenRouter (500+ моделей)'; }

  getModels() {
    return [
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openai/gpt-4.1', name: 'GPT-4.1' },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
      { id: 'mistralai/mistral-medium-3', name: 'Mistral Medium 3' },
    ];
  }

  _buildBody(messages, options = {}) {
    const body = {
      model: options.model || DEFAULT_MODELS[TEXT_PROVIDERS.OPENROUTER],
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

    const data = await ApiClient.fetchJSON(API_URLS.OPENROUTER_CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'Tilda IA Agent',
      },
      body: JSON.stringify(body),
    }, { provider: this.id, timeoutMs: 60000 });

    return extractChatContent(data);
  }

  async chatStream(apiKey, messages, options = {}) {
    const body = this._buildBody(messages, { ...options, stream: true });

    const res = await ApiClient.fetch(API_URLS.OPENROUTER_CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'Tilda IA Agent',
      },
      body: JSON.stringify(body),
    }, { provider: this.id, timeoutMs: 120000, maxRetries: 1 });

    return parseSSEStream(res, options.onChunk);
  }

  async checkKey(apiKey, model) {
    try {
      const result = await this.chat(
        apiKey,
        [{ role: 'user', content: 'Say OK' }],
        { model: model || DEFAULT_MODELS[TEXT_PROVIDERS.OPENROUTER] }
      );
      return { valid: !!result, error: result ? undefined : 'Empty response' };
    } catch (err) {
      return { valid: false, error: err.message || String(err) };
    }
  }
}
