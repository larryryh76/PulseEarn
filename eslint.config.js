import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Engine/context modules deliberately co-locate constants, maps and
      // hooks with component exports (e.g. pse.tsx design-system primitives,
      // AuthContext). Fast-refresh granularity is not a priority here.
      'react-refresh/only-export-components': 'warn',
      // Backend payloads (Vercel functions, Firestore docs, provider APIs)
      // arrive untyped at many boundaries. Full typing is a larger migration;
      // keep visibility without failing the lint run.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Parameters prefixed with `_` are intentional interface placeholders.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
])
