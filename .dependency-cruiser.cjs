module.exports = {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment: 'Circular dependencies obscure ownership and initialization order.',
			from: {},
			to: {
				circular: true,
			},
		},
		{
			name: 'design-system-is-feature-independent',
			severity: 'error',
			from: {
				path: '^src/design-system/',
			},
			to: {
				path: '^src/(features|screens)/',
			},
		},
		{
			name: 'protocol-does-not-import-ui',
			severity: 'error',
			from: {
				path: '^src/features/speakers/(session(?:Commands|Resources|Transport)?|speakerCache|identity|client)\\.ts$',
			},
			to: {
				path: '^src/(screens|components|design-system)/',
			},
		},
		{
			name: 'source-does-not-import-routes',
			severity: 'error',
			from: {
				path: '^src/',
			},
			to: {
				path: '^app/',
			},
		},
		{
			name: 'cross-feature-contracts',
			severity: 'error',
			comment: 'The player composes group UI; other cross-feature access uses speaker contracts.',
			from: {
				path: '^src/features/(groups|speakers)/',
			},
			to: {
				path: '^src/features/player/',
				pathNot: '^src/features/player/VolumeControl\\.tsx$',
			},
		},
	],
	options: {
		doNotFollow: {
			path: 'node_modules',
		},
		exclude: {
			path: '(^|/)(dist|coverage|reports)/',
		},
		tsConfig: {
			fileName: 'tsconfig.json',
		},
		tsPreCompilationDeps: true,
		enhancedResolveOptions: {
			extensions: ['.native.tsx', '.native.ts', '.tsx', '.ts', '.js', '.cjs', '.json'],
			conditionNames: ['react-native', 'import', 'require', 'default'],
		},
		reporterOptions: {
			dot: {
				collapsePattern: 'node_modules/[^/]+',
			},
		},
	},
}
