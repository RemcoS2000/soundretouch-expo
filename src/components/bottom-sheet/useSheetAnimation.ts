import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated } from 'react-native'

import { useAppSettings } from '../../state/AppSettingsContext'

type AnimationOptions = {
	animationProgress?: Animated.Value | undefined
	onExpandedChange?: ((expanded: boolean) => void) | undefined
}

/** Owns the progress listener and spring, including cleanup when its shared value changes. */
function useProgressAnimation(progress: Animated.Value) {
	const { reducedMotion } = useAppSettings()
	const progressValueRef = useRef(0)

	useEffect(() => {
		const id = progress.addListener(({ value }) => {
			progressValueRef.current = value
		})

		return () => {
			progress.removeListener(id)
			progress.stopAnimation()
		}
	}, [progress])

	/** Updates immediately for reduced motion or animates to the requested snap point. */
	const animate = useCallback(
		(toValue: 0 | 1, velocity = 0, onFinished?: () => void) => {
			progress.stopAnimation()
			if (reducedMotion) {
				progress.setValue(toValue)
				onFinished?.()

				return
			}
			Animated.spring(progress, {
				toValue,
				velocity: Math.max(-3.5, Math.min(3.5, velocity)),
				tension: 300,
				friction: 24,
				overshootClamping: true,
				useNativeDriver: true,
			}).start(({ finished }) => {
				if (finished) {
					onFinished?.()
				}
			})
		},
		[progress, reducedMotion]
	)

	return { animate, progressValueRef }
}

/** Keeps expansion, control mounting and header animation in one shared transition. */
export function useSheetAnimation({ animationProgress, onExpandedChange }: AnimationOptions) {
	const [localProgress] = useState(() => new Animated.Value(0))
	const progress = animationProgress ?? localProgress
	const { animate, progressValueRef } = useProgressAnimation(progress)
	const [isExpanded, setIsExpanded] = useState(false)
	const [isVisible, setIsVisible] = useState(false)
	const [ignoreToggleAfterDrag, setIgnoreToggleAfterDrag] = useState(false)

	useEffect(() => {
		onExpandedChange?.(isExpanded)
	}, [isExpanded, onExpandedChange])

	/** Mounts expanded controls before opening their sheet. */
	const open = useCallback(
		(velocity = 0) => {
			setIsExpanded(true)
			setIsVisible(true)
			animate(1, velocity)
		},
		[animate]
	)
	/** Releases expanded controls after the closing animation finishes. */
	const close = useCallback(
		(velocity = 0) => {
			setIsExpanded(false)
			animate(0, velocity, () => setIsVisible(false))
		},
		[animate]
	)
	/** Ignores compatibility presses emitted after a web pointer drag. */
	const toggle = useCallback(() => {
		if (ignoreToggleAfterDrag) {
			return
		}
		if (isExpanded) {
			close(0)

			return
		}
		open(0)
	}, [ignoreToggleAfterDrag, isExpanded, open, close])

	return { progress, progressValueRef, isExpanded, isVisible, open, close, toggle, setIsVisible, setIgnoreToggleAfterDrag }
}
