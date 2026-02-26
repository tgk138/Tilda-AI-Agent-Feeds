/**
 * JSON repair utility for AI-generated responses.
 * AI models often return malformed JSON — this module tries to salvage it.
 * Loaded via importScripts() in background.js.
 *
 * Depends on: lib/errors.js (ParseError)
 */

const JsonRepair = {
  /**
   * Parse JSON from AI response, applying multiple repair strategies.
   * @param {string} raw - Raw text from AI (may include markdown fences, trailing commas, etc.)
   * @returns {object} Parsed JSON
   * @throws {ParseError} If all repair strategies fail
   */
  parse(raw) {
    const original = String(raw || '').trim();
    if (!original) throw new ParseError('Empty AI response', raw);

    const strategies = [
      () => JSON.parse(original),
      () => JSON.parse(this._stripMarkdownFences(original)),
      () => JSON.parse(this._fixTrailingCommas(this._stripMarkdownFences(original))),
      () => JSON.parse(this._extractJsonBlock(original)),
      () => JSON.parse(this._fixTrailingCommas(this._extractJsonBlock(original))),
      () => JSON.parse(this._aggressiveClean(original)),
    ];

    for (const strategy of strategies) {
      try {
        return strategy();
      } catch (_) {}
    }

    throw new ParseError(
      'Модель вернула некорректный JSON. Попробуйте повторить генерацию.',
      original
    );
  },

  /**
   * Remove ```json ... ``` markdown fences.
   * @param {string} text
   * @returns {string}
   */
  _stripMarkdownFences(text) {
    return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  },

  /**
   * Remove trailing commas before } or ].
   * @param {string} text
   * @returns {string}
   */
  _fixTrailingCommas(text) {
    return text.replace(/,\s*([}\]])/g, '$1');
  },

  /**
   * Extract the first JSON object {...} or array [...] from text.
   * Handles cases where AI prefixes/suffixes JSON with prose.
   * @param {string} text
   * @returns {string}
   */
  _extractJsonBlock(text) {
    // Find the first { or [
    const objStart = text.indexOf('{');
    const arrStart = text.indexOf('[');

    let start = -1;
    let openChar = '{';
    let closeChar = '}';

    if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
      start = objStart;
      openChar = '{';
      closeChar = '}';
    } else if (arrStart >= 0) {
      start = arrStart;
      openChar = '[';
      closeChar = ']';
    }

    if (start < 0) return text;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === '\\') {
        escape = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    // Fallback: no balanced closing found, return from start
    return text.slice(start);
  },

  /**
   * Aggressive cleanup: strip all non-JSON content.
   * @param {string} text
   * @returns {string}
   */
  _aggressiveClean(text) {
    let cleaned = this._stripMarkdownFences(text);
    cleaned = this._extractJsonBlock(cleaned);
    cleaned = this._fixTrailingCommas(cleaned);

    // Fix unescaped newlines inside string values
    cleaned = cleaned.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, '\\n');

    // Fix single quotes used as string delimiters (crude)
    // Only if there are no double-quoted strings
    if (cleaned.indexOf('"') < 0 && cleaned.indexOf("'") >= 0) {
      cleaned = cleaned.replace(/'/g, '"');
    }

    return cleaned;
  },
};
