/** Type declarations for configuration-only packages that do not ship their own. */
declare module 'eslint-config-expo/flat.js' {
	import type { Linter } from 'eslint'
	const config: Linter.Config[]

	export default config
}
declare module 'eslint-plugin-react-native' {
	import type { ESLint } from 'eslint'
	const plugin: ESLint.Plugin

	export default plugin
}
