import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import stylisticJs from '@stylistic/eslint-plugin-js';
import deprecation from 'eslint-plugin-deprecation';
import tsParser from '@typescript-eslint/parser';
import { FlatCompat } from '@eslint/eslintrc';

import path from 'path';
import { fileURLToPath } from 'url';

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  js.configs.recommended,
  ...compat.extends('airbnb-base'),
  {
    ignores: ['**/dist/'],
  },
  {
    settings: {
      'import/resolver': {
        node: {},
        typescript: {
          project: './tools/tsconfig.json',
        },
        alias: {
          map: [
            ['@', './src/core'],
            ['@libs', './src/libs'],
            ['@@', '.'],
          ],
          extensions: ['.js', '.jsx', '.ts', '.d.ts', '.tsx'],
        },
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.js', '.jsx', '.ts', '.d.ts', '.tsx'],
      },
    },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'import/no-cycle': ['off'], // Need to fix this.
    },
  },
  {
    name: 'airbnb/overrides',
    rules: {
      'array-callback-return': ['off'],
      'block-scoped-var': ['off'],
      'brace-style': ['off'],
      'class-methods-use-this': ['off'],
      'consistent-return': ['off'],
      'default-case': ['off'],
      'func-names': ['off'],
      'guard-for-in': ['off'],
      'import/no-mutable-exports': ['off'],
      'import/prefer-default-export': ['off'],
      'max-classes-per-file': ['off'],
      'max-len': ['off'],
      'new-cap': ['off'],
      'no-alert': ['off'],
      'no-array-constructor': ['off'],
      'no-bitwise': ['off'],
      'no-cond-assign': ['off'],
      'no-console': ['off'],
      'no-continue': ['off'],
      'no-empty': ['off'],
      'no-eval': ['off'],
      'no-extend-native': ['off'],
      'no-global-assign': ['off'],
      'no-lone-blocks': ['off'],
      'no-lonely-if': ['off'],
      'no-loop-func': ['off'],
      'no-mixed-operators': ['off'],
      'no-multi-assign': ['off'],
      'no-multi-str': ['off'],
      'no-nested-ternary': ['off'],
      'no-new-func': ['off'],
      'no-new': ['off'],
      'no-param-reassign': ['off'],
      'no-plusplus': ['off'],
      'no-restricted-globals': ['off'],
      'no-restricted-properties': ['off'],
      'no-restricted-syntax': ['off'],
      'no-return-assign': ['off'],
      'no-sequences': ['off'],
      'no-shadow': ['off'],
      'no-throw-literal': ['off'],
      'no-underscore-dangle': ['off'],
      'no-unused-expressions': ['off'],
      'no-use-before-define': ['off'],
      'no-useless-concat': ['off'],
      'no-var': ['off'],
      'no-void': ['off'],
      'prefer-const': ['off'],
      'prefer-destructuring': ['off'],
      'prefer-rest-params': ['off'],
      'prefer-spread': ['off'],
      'vars-on-top': ['off'],
      camelcase: ['off'],
      eqeqeq: ['off'],
      radix: ['off'],
    },
  },
  {
    name: 'litegraph.tsx/standard',
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: ['./tools/tsconfig.json'],
      },
    },
    plugins: {
      '@stylistic': stylistic,
      '@stylistic/js': stylisticJs,
      deprecation,
    },
    rules: {

      /* ESLint */
      'no-inner-declarations': 0,
      'no-prototype-builtins': 0,
      'no-redeclare': 0,
      'no-undef': 0, /* had to disable because it doesn't recognize DOM objects */
      'no-unused-vars': [0, {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      /* Stylistic (alphabetically) */
      '@stylistic/arrow-parens': [0, 'always'],
      '@stylistic/arrow-spacing': [0, { before: true, after: true }],
      '@stylistic/brace-style': [0, '1tbs', { allowSingleLine: false }],
      '@stylistic/comma-dangle': [1, 'always-multiline'],
      '@stylistic/comma-spacing': [1, { before: false, after: true }],
      '@stylistic/comma-style': [1, 'last'],
      '@stylistic/computed-property-spacing': [0, 'never'],
      '@stylistic/dot-location': [0, 'object'],
      '@stylistic/eol-last': [1, 'always'],
      '@stylistic/function-call-spacing': [1, 'never'],
      '@stylistic/function-paren-newline': [0, 'multiline'],
      '@stylistic/implicit-arrow-linebreak': [0, 'beside'],
      '@stylistic/indent': [1, 2],
      '@stylistic/indent-binary-ops': [0, 2],
      '@stylistic/key-spacing': [1, { beforeColon: false, afterColon: true, mode: 'strict' }],
      '@stylistic/keyword-spacing': [1, { before: true, after: true, overrides: {} }],
      '@stylistic/lines-around-comment': [0, { beforeBlockComment: true }],
      '@stylistic/lines-between-class-members': [0, { enforce: 'always', exceptAfterSingleLine: false }],
      '@stylistic/max-len': [0, {
        code: 120,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
      '@stylistic/max-statements-per-line': [0, { max: 1 }],
      '@stylistic/js/multiline-comment-style': [0, 'starred-block'],
      '@stylistic/new-parens': [0, 'always'],
      '@stylistic/no-extra-semi': [1],
      '@stylistic/no-floating-decimal': [2],
      '@stylistic/no-multi-spaces': [1],
      '@stylistic/no-tabs': [1],
      '@stylistic/no-trailing-spaces': [1],
      '@stylistic/object-curly-newline': [0, { multiline: true }],
      '@stylistic/quotes': [0, 'double', { allowTemplateLiterals: true }],
      '@stylistic/semi-style': [1, 'last'],
      '@stylistic/space-before-blocks': [1, 'always'],
      '@stylistic/spaced-comment': [1, 'always'],

      /** Deprecation */
      'import/no-deprecated': ['error'],
      // eslint-disable-next-line spaced-comment
      // /* Toggle here for migration.
      'deprecation/deprecation': 'off',
      // eslint-disable-next-line spaced-comment, @stylistic/spaced-comment
      /*/
      'deprecation/deprecation': 'error',
      // */
    },
  },
];
