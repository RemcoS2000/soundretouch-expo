// @ts-check
import stylistic from '@stylistic/eslint-plugin'
import query from '@tanstack/eslint-plugin-query'

import expo from 'eslint-config-expo/flat.js'
import prettier from 'eslint-config-prettier'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import reactHooks from 'eslint-plugin-react-hooks'
import reactNative from 'eslint-plugin-react-native'
import sonarjs from 'eslint-plugin-sonarjs'
import { config as typescriptConfig, configs as typescriptConfigs } from 'typescript-eslint'

// Production and tooling use type-aware linting. Vitest fixtures retain standard
// TypeScript linting: their deliberately replaced runtime modules do not share production types.
const typedFiles = ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', 'proxy/**/*.ts', 'scripts/**/*.ts', 'index*.ts', '*config.ts']

/** @type {import('eslint').Linter.Config} */
const quality = {
	files: ['src/**/*.{ts,tsx}'],
	plugins: { sonarjs, '@stylistic': stylistic, jsdoc: jsdocPlugin },
	settings: { jsdoc: { mode: 'typescript' } },
	rules: {
		'sonarjs/cognitive-complexity': ['error', 15],
		complexity: ['warn', 10],
		'max-depth': ['error', 3],
		'max-nested-callbacks': ['warn', 3],
		'max-params': ['warn', 4],
		'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
		'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
		'no-nested-ternary': 'error',
		curly: ['error', 'all'],
		'@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
		'@typescript-eslint/no-misused-promises': 'error',
		'@typescript-eslint/switch-exhaustiveness-check': 'error',
		'@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
		'@stylistic/padding-line-between-statements': [
			'error',
			{ blankLine: 'always', prev: '*', next: 'return' },
			{ blankLine: 'always', prev: ['const', 'let'], next: '*' },
			{ blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
		],
		'jsdoc/check-param-names': 'error',
		'jsdoc/check-tag-names': 'error',
		'jsdoc/require-description': 'error',
		'jsdoc/require-jsdoc': [
			'error',
			{
				require: { FunctionDeclaration: true, MethodDefinition: true },
			},
		],
	},
}

export default typescriptConfig(
	{ ignores: ['node_modules/**', 'dist/**', '.expo/**', 'coverage/**', 'reports/**', 'android/**', 'ios/**'] },
	...expo.map((config) => ({
		...config,
		plugins: config.plugins?.['react-hooks'] ? { ...config.plugins, 'react-hooks': reactHooks } : (config.plugins ?? {}),
	})),
	...typescriptConfigs.recommended.map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
	...typescriptConfigs.recommendedTypeChecked.map((config) => ({ ...config, files: typedFiles })),
	{
		files: typedFiles,
		languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
	},
	quality,
	{
		files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
		ignores: ['src/features/speakers/client.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '@soundretouch/api/device',
							importNames: ['SoundTouchDevice'],
							allowTypeImports: true,
							message: 'Use the provider-owned speaker instance; construct devices only in the client factory.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/**/*.tsx'],
		rules: {
			// JSX is declarative; component length remains advisory and gets a larger review threshold.
			'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
			'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
		},
	},
	{
		files: ['**/*.{js,cjs,mjs}'],
		languageOptions: {
			globals: {
				require: 'readonly',
				module: 'readonly',
				exports: 'readonly',
				__dirname: 'readonly',
				process: 'readonly',
				console: 'readonly',
				Buffer: 'readonly',
			},
		},
	},
	{
		files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
		plugins: { '@tanstack/query': query, 'react-native': reactNative, 'react-hooks': reactHooks },
		rules: {
			...query.configs['flat/recommended'][0]?.rules,
			...reactHooks.configs.recommended.rules,
			'react-hooks/exhaustive-deps': 'error',
			'react-native/no-unused-styles': 'error',
			'react-native/no-raw-text': 'error',
		},
	},
	prettier
)
