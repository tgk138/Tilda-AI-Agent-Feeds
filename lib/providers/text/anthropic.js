/**
 * Anthropic Text Provider — Claude models via Messages API.
 * Note: Anthropic API uses a different format than OpenAI.
 */

class AnthropicTextProvider extends BaseTextProvider {
  get id() { return TEXT_PROVIDERS.ANTHROPIC; }
  get name() { return 'Anthropic (Claude)'; }

  getModels() {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ];
  }

  _convertMessages(messages) {
    let systemPrompt = '';
    const apiMessages = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    return { systemPrompt, apiMessages };
  }

  async chat(apiKey, messages, options = {}) {
    const { systemPrompt, apiMessages } = this._convertMessages(messages);
    const model = options.model || DEFAULT_MODELS[TEXT_PROVIDERS.ANTHROPIC];

    const body = {
      model,
      max_tokens: 8192,
      messages: apiMessages,
    };

    if (systemPrompt) body.system = systemPrompt;

    const res = await fetch(API_URLS.ANTHROPIC_MESSAGES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.content && Array.isArray(data.content)) {
      return data.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
    }
    return '';
  }

  async chatStream(apiKey, messages, options = {}) {
    const { systemPrompt, apiMessages } = this._convertMessages(messages);
    const model = options.model || DEFAULT_MODELS[TEXT_PROVIDERS.ANTHROPIC];

    const body = {
      model,
      max_tokens: 8192,
      messages: apiMessages,
      stream: true,
    };

    if (systemPrompt) body.system = systemPrompt;

    const res = await fetch(API_URLS.ANTHROPIC_MESSAGES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    // Anthropic SSE format differs from OpenAI
    const reader = res.body.getReader();
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
            if (json.type === 'content_block_delta' && json.delta && json.delta.text) {
              fullContent += json.delta.text;
              if (typeof options.onChunk === 'function') options.onChunk(json.delta.text);
            }
            if (json.type === 'message_stop') return fullContent;
          } catch (_) {}
        }
      }
    }

    return fullContent;
  }

  async checkKey(apiKey, model) {
    try {
      const result = await this.chat(
        apiKey,
        [{ role: 'user', content: 'Say OK' }],
        { model: model || DEFAULT_MODELS[TEXT_PROVIDERS.ANTHROPIC] }
      );
      return { valid: !!result, error: result ? undefined : 'Empty response' };
    } catch (err) {
      return { valid: false, error: err.message || String(err) };
    }
  }
}
