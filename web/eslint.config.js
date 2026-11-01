import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  // Ignore build and cache directories
  {
    ignores: ['dist/**', 'node_modules/**', '.astro/**'],
  },
  // TypeScript standard configurations
  ...tseslint.configs.recommended,
  // Astro standard configurations
  ...eslintPluginAstro.configs.recommended,
  // React Hooks flat configuration
  reactHooks.configs.flat.recommended,
  // Project-specific rule overrides
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.astro'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
