import { useNavigation } from 'expo-router'
import { useEffect } from 'react'
import { BackHandler, Platform } from 'react-native'

/** Finds visible, enabled browser controls in the sheet's keyboard order. */
function focusableControls(panel: HTMLElement | null) {
	return Array.from(panel?.querySelectorAll<HTMLElement>('[tabindex="0"], button, input, select, a[href]') ?? []).filter(
		(element) => !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true' && element.offsetParent !== null
	)
}

/** Wraps Tab navigation only when focus would leave the modal panel. */
function trapTab(event: KeyboardEvent, panel: HTMLElement | null) {
	const controls = focusableControls(panel)
	const first = controls[0]
	const last = controls[controls.length - 1]
	const outside = !panel?.contains(document.activeElement)

	if (event.shiftKey && (document.activeElement === first || outside)) {
		event.preventDefault()
		last?.focus()
	} else if (!event.shiftKey && (document.activeElement === last || outside)) {
		event.preventDefault()
		first?.focus()
	}
}

/** Moves focus into expanded controls, handles Escape, and restores the opener on cleanup. */
function useWebSheetFocus(panelId: string, expanded: boolean, modal: boolean, close: () => void) {
	useEffect(() => {
		if (Platform.OS !== 'web' || !expanded) {
			return
		}
		const panel = document.getElementById(panelId)
		const opener = document.activeElement as HTMLElement | null

		focusableControls(panel)[0]?.focus()
		/** Dismisses on Escape and confines keyboard navigation for modal sheets. */
		const keydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				close()
			} else if (event.key === 'Tab' && modal) {
				trapTab(event, panel)
			}
		}

		document.addEventListener('keydown', keydown)

		return () => {
			document.removeEventListener('keydown', keydown)
			if (opener?.isConnected && opener.offsetParent !== null) {
				opener.focus()
			}
		}
	}, [panelId, expanded, modal, close])
}

/** Shares dismissal behavior between route changes, native Back and browser keyboard controls. */
export function useSheetDismissal(panelId: string, expanded: boolean, modal: boolean, close: () => void) {
	const navigation = useNavigation()

	useEffect(() => navigation.addListener('blur', () => close()), [navigation, close])
	useEffect(() => {
		if (!expanded) {
			return
		}
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			close()

			return true
		})

		return () => subscription.remove()
	}, [expanded, close])
	useWebSheetFocus(panelId, expanded, modal, close)
}
