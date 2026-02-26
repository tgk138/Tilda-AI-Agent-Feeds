/**
 * kie.ai Text Provider — proxy hub for Gemini 3 Pro.
 */

class KieTextProvider extends BaseTextProvider {
  get id() { return TEXT_PROVIDERS.KIE; }
  get name() { return 'kie.ai (Gemini 3 Pro)'; }

  getModels() {
    return [
      { id: 'gemini-3-pro', name: 'Gemini 3 Pro' },
    ];
  }

  async chat(apiKey, messages, options = {}) {
    const body = {
      messages: messages.map((m) => ({
        role: m.role,
        content: [{ type: 'text', text: m.content }],
      })),
      stream: false,
      include_thoughts: false,
      reasoning_effort: options.reasoningEffort || 'high',
    };

    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const data = await ApiClient.fetchJSON(API_URLS.KIE_CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }, { provider: this.id, timeoutMs: 60000 });

    return extractChatContent(data);
  }

  async chatStream(apiKey, messages, options = {}) {
    const body = {
      messages: messages.map((m) => ({
        role: m.role,
        content: [{ type: 'text', text: m.content }],
      })),
      stream: true,
      include_thoughts: false,
      reasoning_effort: options.reasoningEffort || 'low',
    };

    const res = await ApiClient.fetch(API_URLS.KIE_CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }, { provider: this.id, timeoutMs: 120000, maxRetries: 1 });

    return parseSSEStream(res, options.onChunk);
  }

  async checkKey(apiKey) {
    try {
      const result = await this.chat(apiKey, [{ role: 'user', content: 'Say OK' }], { reasoningEffort: 'low' });
      return { valid: !!result, error: result ? undefined : 'Empty response' };
    } catch (err) {
      return { valid: false, error: err.message || String(err) };
    }
  }
}
