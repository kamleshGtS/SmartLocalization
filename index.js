const { translate } = require('bing-translate-api');

/**
 * SmartLocalization - A flexible localization class that supports nested translations, variable interpolation,
 * and automatic translation using Bing Translate API
 */
class SmartLocalization {
  /**
   * Creates a new SmartLocalization instance
   * @param {Object} options - Configuration options
   * @param {string} [options.defaultLang='en'] - Default language code
   * @param {Object} options.translations - Object containing translations for different languages
   * @throws {Error} If translations object is not provided or invalid
   */
  constructor({ defaultLang = 'en', translations = {} }) {
    if (!translations || typeof translations !== 'object') {
      throw new Error('Translations object is required and must be a valid object');
    }

    if (typeof defaultLang !== 'string' || defaultLang.trim() === '') {
      throw new Error('Default language must be a non-empty string');
    }

    this.defaultLang = defaultLang;
    this.currentLang = defaultLang;
    this.translations = translations;
  }

  /**
   * Switches the current language
   * @param {string} lang - Language code to switch to
   * @returns {boolean} True if language was switched successfully, false otherwise
   */
  switchLanguage(lang) {
    if (typeof lang !== 'string' || lang.trim() === '') {
      console.warn('Language code must be a non-empty string');
      return false;
    }

    if (this.translations[lang]) {
      this.currentLang = lang;
      return true;
    }

    console.warn(`Language "${lang}" not found. Falling back to default "${this.defaultLang}".`);
    return false;
  }

  /**
   * Translates text using Bing Translate API
   * @param {string} text - Text to translate
   * @param {string} [fromLang] - Source language code (optional, will auto-detect if not provided)
   * @param {string} [toLang] - Target language code (defaults to current language)
   * @returns {Promise<string>} Translated text
   * @throws {Error} If translation fails
   */
  async translateText(text, fromLang, toLang = this.currentLang) {
    if (typeof text !== 'string' || text.trim() === '') {
      throw new Error('Text to translate must be a non-empty string');
    }

    if (toLang === this.defaultLang) {
      return text; // No need to translate if target is default language
    }

    try {
      const result = await translate(text, fromLang, toLang);
      return result.translation;
    } catch (error) {
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Translates a key with optional variable interpolation and automatic translation
   * @param {string} key - Translation key (supports dot notation for nested keys)
   * @param {Object} [variables={}] - Variables to interpolate in the translation
   * @param {boolean} [autoTranslate=false] - Whether to automatically translate if key not found
   * @param {string} [fromLang] - Source language for auto-translation (optional)
   * @returns {Promise<string>} Translated text with interpolated variables
   */
  async translate(key, variables = {}, autoTranslate = false, fromLang) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Translation key must be a non-empty string');
    }

    if (variables && typeof variables !== 'object') {
      throw new Error('Variables must be an object');
    }

    const getNested = (obj, keyPath) =>
      keyPath.split('.').reduce((acc, part) => acc?.[part], obj);

    const langData = this.translations[this.currentLang] || {};
    const defaultData = this.translations[this.defaultLang] || {};
    let value = getNested(langData, key) || getNested(defaultData, key);

    // If key not found and autoTranslate is enabled, try to translate the key
    if (!value && autoTranslate) {
      try {
        value = await this.translateText(key, fromLang);
      } catch (error) {
        console.warn(`Auto-translation failed for key "${key}": ${error.message}`);
        value = `[${key}]`;
      }
    } else if (!value) {
      value = `[${key}]`;
    }

    if (typeof value === 'string') {
      return value.replace(/{(.*?)}/g, (_, varName) => variables[varName] ?? `{${varName}}`);
    }

    return value;
  }
}

module.exports = SmartLocalization;
  