/**
 * kie.ai Media Provider — Nano Banana Pro image generation via async task polling.
 * Also supports GPT Image models through the kie.ai jobs API.
 */

class KieBananaMediaProvider extends BaseMediaProvider {
  get id() { return MEDIA_PROVIDERS.KIE_BANANA; }
  get name() { return 'kie.ai (Nano Banana Pro)'; }

  getModels() {
    return [
      { id: 'nano-banana-pro', name: 'Nano Banana Pro', requiresInputUrls: false },
    ];
  }

  async generateImage(apiKey, input, onProgress) {
    const model = input.model || 'nano-banana-pro';
    const payload = {
      prompt: input.prompt || 'Cover image for blog post',
      aspect_ratio: input.aspect_ratio || '4:3',
      resolution: input.resolution || '1K',
      output_format: input.output_format || 'png',
    };

    if (input.image_input && Array.isArray(input.image_input) && input.image_input.length > 0) {
      payload.image_input = input.image_input.slice(0, 8);
    }

    // Nano Banana requires 1K resolution for Tilda upload compatibility
    if (model === 'nano-banana-pro') {
      payload.resolution = '1K';
    }

    const taskId = await this._createTask(apiKey, model, payload);
    if (typeof onProgress === 'function') onProgress({ state: 'created', taskId });

    return this._pollUntilDone(apiKey, taskId, onProgress);
  }

  async _createTask(apiKey, model, payload) {
    const data = await ApiClient.fetchJSON(`${API_URLS.KIE_JOBS}/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: payload }),
    }, { provider: this.id, timeoutMs: 120000 });

    if (data.code !== 200 || !data.data || !data.data.taskId) {
      throw new Error(data.message || data.msg || 'Failed to create task');
    }
    return data.data.taskId;
  }

  async _pollUntilDone(apiKey, taskId, onProgress) {
    for (let attempt = 0; attempt < IMAGE_POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, IMAGE_POLL_INTERVAL_MS));

      const data = await ApiClient.fetchJSON(`${API_URLS.KIE_JOBS}/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      }, { provider: this.id, timeoutMs: 15000, maxRetries: 1 });

      if (data.code !== 200 || !data.data) {
        throw new Error(data.message || data.msg || 'Failed to poll task');
      }

      const record = data.data;
      if (typeof onProgress === 'function') onProgress({ state: record.state, taskId, record });

      if (record.state === 'success') {
        let urls = [];
        try {
          const parsed = JSON.parse(record.resultJson || '{}');
          urls = parsed.resultUrls || (parsed.resultUrl ? [parsed.resultUrl] : []);
        } catch (_) {}
        if (urls.length === 0) throw new Error('Нет URL в результате');
        return urls[0];
      }

      if (record.state === 'fail') {
        throw new Error(record.failMsg || record.failCode || 'Генерация не удалась');
      }
    }

    throw new Error('Превышено время ожидания генерации');
  }

  async checkKey(apiKey) {
    try {
      const data = await ApiClient.fetchJSON(`${API_URLS.KIE_JOBS}/createTask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'nano-banana-pro',
          input: { prompt: 'test', aspect_ratio: '1:1', resolution: '1K', output_format: 'png' },
        }),
      }, { provider: this.id, timeoutMs: 60000 });

      if (data.code === 200 && data.data && data.data.taskId) {
        return { valid: true };
      }
      return { valid: false, error: data.message || 'Invalid key' };
    } catch (err) {
      return { valid: false, error: err.message || String(err) };
    }
  }
}

/**
 * kie.ai GPT Image Provider — GPT Image 1.5 models via kie.ai jobs API.
 */
class KieGptImageMediaProvider extends BaseMediaProvider {
  get id() { return MEDIA_PROVIDERS.KIE_GPT_IMAGE; }
  get name() { return 'kie.ai (GPT Image 1.5)'; }

  getModels() {
    return [
      { id: 'gpt-image/1.5-text-to-image', name: 'GPT Image 1.5 (Text→Image)', requiresInputUrls: false },
      { id: 'gpt-image/1.5-image-to-image', name: 'GPT Image 1.5 (Image→Image)', requiresInputUrls: true },
    ];
  }

  async generateImage(apiKey, input, onProgress) {
    const model = input.model || 'gpt-image/1.5-text-to-image';
    const imageUrls = (input.image_input && Array.isArray(input.image_input))
      ? input.image_input.filter((url) => url && typeof url === 'string')
      : [];

    let payload;
    if (model === 'gpt-image/1.5-image-to-image') {
      if (imageUrls.length === 0) {
        throw new Error('Для модели GPT Image 1.5 (image-to-image) требуется минимум 1 input URL.');
      }
      payload = {
        input_urls: imageUrls.slice(0, 8),
        prompt: input.prompt || 'Edit this image for article cover',
        aspect_ratio: input.aspect_ratio || '3:2',
        quality: input.quality || 'medium',
      };
    } else {
      payload = {
        prompt: input.prompt || 'Create an image for article cover',
        aspect_ratio: input.aspect_ratio || '3:2',
        quality: input.quality || 'medium',
      };
    }

    // Reuse kie.ai polling infrastructure
    const bananaProvider = new KieBananaMediaProvider();
    const taskId = await bananaProvider._createTask(apiKey, model, payload);
    if (typeof onProgress === 'function') onProgress({ state: 'created', taskId });
    return bananaProvider._pollUntilDone(apiKey, taskId, onProgress);
  }

  async checkKey(apiKey) {
    const bananaProvider = new KieBananaMediaProvider();
    return bananaProvider.checkKey(apiKey);
  }
}
