// @ts-check
import eslint from '@eslint/js'

import prettier from 'eslint-config-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: ['node_modules', '.expo', 'dist'],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		plugins: {
			react,
			'react-hooks': reactHooks,
		},
		rules: {
			...react.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			'react/react-in-jsx-scope': 'off',
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
	},
	prettier
)
