/**
 * Google Gemini Media Provider — image generation via Gemini native API.
 */

class GoogleImagenMediaProvider extends BaseMediaProvider {
  get id() { return MEDIA_PROVIDERS.GOOGLE_IMAGEN; }
  get name() { return 'Google Gemini (Image)'; }

  getModels() {
    return [
      { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Image', requiresInputUrls: false },
    ];
  }

  async generateImage(apiKey, input, onProgress) {
    if (typeof onProgress === 'function') onProgress({ state: 'generating', taskId: 'official-sync' });

    const model = input.model || DEFAULT_MODELS[MEDIA_PROVIDERS.GOOGLE_IMAGEN];
    const url = `${API_URLS.GOOGLE_GENERATE}/${model}:generateContent?key=${apiKey}`;

    const contents = [];
    contents.push({ text: input.prompt });

    // Load reference images if provided
    if (input.image_input && Array.isArray(input.image_input)) {
      for (const imgUrl of input.image_input) {
        if (!imgUrl || typeof imgUrl !== 'string') continue;

        try {
          if (imgUrl.startsWith('data:image/')) {
            const mimeType = imgUrl.substring(5, imgUrl.indexOf(';'));
            const base64 = imgUrl.substring(imgUrl.indexOf(',') + 1);
            contents.push({ inlineData: { mimeType, data: base64 } });
            continue;
          }

          if (typeof onProgress === 'function') onProgress({ state: 'downloading_reference', taskId: 'official-sync' });
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
            contents.push({ inlineData: { mimeType, data: base64 } });
          }
        } catch (err) {
          console.warn('[TK-API] Failed to load reference image:', imgUrl, err);
        }
      }
    }

    const body = {
      contents: [{ role: 'user', parts: contents }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: input.aspect_ratio || '4:3' },
      },
    };

    if (input.resolution) {
      const res = input.resolution.toUpperCase();
      if (res === '1K' || res === '2K' || res === '4K') {
        body.generationConfig.imageConfig.imageSize = res;
      }
    }

    const data = await ApiClient.fetchJSON(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, { provider: this.id, timeoutMs: 120000 });

    let base64Data = null;
    const candidates = data.candidates || [];
    if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Data = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
        }
      }
    }

    if (!base64Data) {
      throw new Error('Ответ не содержит изображения (inlineData).');
    }

    if (typeof onProgress === 'function') onProgress({ state: 'success', taskId: 'official-sync' });
    return base64Data;
  }

  async checkKey(apiKey) {
    try {
      const model = DEFAULT_MODELS[MEDIA_PROVIDERS.GOOGLE_IMAGEN];
      const url = `${API_URLS.GOOGLE_GENERATE}/${model}:generateContent?key=${apiKey}`;
      await ApiClient.fetchJSON(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Generate a small 1x1 pixel white image' }] }],
          generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
        }),
      }, { provider: this.id, timeoutMs: 120000 });
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message || String(err) };
    }
  }
}
