// ESLint flat config — Expo's shared config covers React/RN/hooks rules.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      // Deno code — different globals/import scheme, not part of the app bundle.
      'supabase/functions/**',
    ],
  },
]);
