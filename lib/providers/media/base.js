/**
 * Base Media Provider — interface contract for all image generation providers.
 * Each provider must implement: id, name, generateImage(), checkKey(), getModels().
 */

class BaseMediaProvider {
  /** @returns {string} Unique provider ID (matches MEDIA_PROVIDERS constant) */
  get id() { throw new Error('Not implemented'); }

  /** @returns {string} Human-readable name */
  get name() { throw new Error('Not implemented'); }

  /**
   * Generate an image.
   * @param {string} apiKey
   * @param {object} input
   * @param {string} input.prompt - Text prompt
   * @param {string} [input.model] - Model ID
   * @param {string} [input.aspect_ratio] - e.g. '4:3', '16:9'
   * @param {string} [input.resolution] - e.g. '1K', '2K'
   * @param {string} [input.output_format] - e.g. 'png', 'jpg'
   * @param {string} [input.quality] - e.g. 'medium', 'high'
   * @param {string[]} [input.image_input] - Reference image URLs for img2img
   * @param {function} [onProgress] - Progress callback: ({state: string, taskId?: string})
   * @returns {Promise<string>} Image URL or base64 data URL
   */
  async generateImage(_apiKey, _input, _onProgress) {
    throw new Error('Not implemented');
  }

  /**
   * Validate API key.
   * @param {string} apiKey
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async checkKey(_apiKey) {
    throw new Error('Not implemented');
  }

  /**
   * Get available models for this provider.
   * @returns {{id: string, name: string, requiresInputUrls?: boolean}[]}
   */
  getModels() {
    return [];
  }
}
