import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        // Service worker globals
        importScripts: 'readonly',
        // Lib functions loaded via importScripts in background.js
        streamChatCompletions: 'readonly',
        generateStructuredPost: 'readonly',
        generateWordstatSeedPhrases: 'readonly',
        buildWordstatSemanticCore: 'readonly',
        generateImage: 'readonly',
        collectWordstatKeywords: 'readonly',
        wordstatGetRegionsTree: 'readonly',
        // Constants & storage loaded via importScripts
        STORAGE_KEYS_ALL: 'readonly',
        SK: 'readonly',
        StorageHelper: 'readonly',
        // Provider registry loaded via importScripts
        ProviderRegistry: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',
      'no-constant-condition': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'eqeqeq': ['warn', 'smart'],
      'no-var': 'warn',
      'prefer-const': 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'backup/', 'playwright-*.js'],
  },
];
