/**
 * OpenAI GPT Image Provider — direct OpenAI image generation.
 * Uses the official OpenAI Images API.
 */

class GptImageMediaProvider extends BaseMediaProvider {
  get id() { return MEDIA_PROVIDERS.GPT_IMAGE; }
  get name() { return 'OpenAI (GPT Image)'; }

  getModels() {
    return [
      { id: 'gpt-image-1', name: 'GPT Image 1', requiresInputUrls: false },
    ];
  }

  async generateImage(apiKey, input, onProgress) {
    if (typeof onProgress === 'function') onProgress({ state: 'generating', taskId: 'openai-sync' });

    const model = input.model || 'gpt-image-1';

    const sizeMap = {
      '1:1': '1024x1024',
      '4:3': '1536x1024',
      '3:4': '1024x1536',
      '16:9': '1536x1024',
      '9:16': '1024x1536',
    };
    const size = sizeMap[input.aspect_ratio] || '1536x1024';

    const body = {
      model,
      prompt: input.prompt || 'Create an image for article cover',
      n: 1,
      size,
      quality: input.quality || 'medium',
    };

    const data = await ApiClient.fetchJSON('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }, { provider: this.id, timeoutMs: 120000 });
    const imageData = data.data && data.data[0];

    if (!imageData) {
      throw new Error('No image in response');
    }

    if (typeof onProgress === 'function') onProgress({ state: 'success', taskId: 'openai-sync' });

    if (imageData.b64_json) {
      return `data:image/png;base64,${imageData.b64_json}`;
    }

    return imageData.url;
  }

  async checkKey(apiKey) {
    try {
      await ApiClient.fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      }, { provider: this.id, timeoutMs: 60000 });
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message || String(err) };
    }
  }
}
