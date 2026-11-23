import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import pluginQuery from '@tanstack/eslint-plugin-query';
import prettier from 'eslint-config-prettier';

const LAYERING_MESSAGE =
  'Import the Supabase client only inside src/lib/**, src/app/providers/**, or src/features/*/api/**. Components and hooks must go through the service layer.';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'src/types/database.ts',
      'supabase/functions',
      'public/vendor',
    ],
  },

  ...tseslint.configs.recommended,
  ...pluginQuery.configs['flat/recommended'],

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Clean layering: only the service layer / infra may import the Supabase client.
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@/lib/supabase', message: LAYERING_MESSAGE }],
          patterns: [{ group: ['**/lib/supabase'], message: LAYERING_MESSAGE }],
        },
      ],
    },
  },

  // Infra + service layer may import the Supabase client.
  {
    files: ['src/lib/**', 'src/app/providers/**', 'src/features/*/api/**'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // Node-context files: configs and the one-off legacy migration scripts.
  {
    files: [
      '*.config.{js,ts}',
      'vite.config.ts',
      'tailwind.config.ts',
      'eslint.config.js',
      'scripts/**',
    ],
    languageOptions: { globals: globals.node },
  },

  prettier,
);
