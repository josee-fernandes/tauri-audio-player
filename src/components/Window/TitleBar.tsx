import { getCurrentWindow } from '@tauri-apps/api/window'
import { useId, useMemo } from 'react'

import '@/styles/window.css'
import { Minus, Square, X } from 'lucide-react'

export const TitleBar: React.FC = () => {
	const appWindow = useMemo(() => getCurrentWindow(), [])

	const minimizeButtonId = useId()
	const maximizeButtonId = useId()
	const closeButtonId = useId()

	const handleMinimize = () => {
		appWindow.minimize()
	}

	const handleMaximize = async () => {
		appWindow.toggleMaximize()
	}

	const handleClose = () => {
		appWindow.close()
	}

	return (
		<div className="py-2 px-2 select-none grid grid-cols-[auto_max-content] text-zinc-950 dark:text-zinc-50 z-[999999999]">
			<div data-tauri-drag-region />
			<div className="flex gap-2">
				<button
					type="button"
					id={minimizeButtonId}
					title="minimize"
					className="h-max cursor-pointer border rounded-lg p-2 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-all"
					onClick={handleMinimize}
				>
					<Minus className="w-4 h-4" />
				</button>
				<button
					type="button"
					id={maximizeButtonId}
					title="maximize"
					className="h-max cursor-pointer border rounded-lg p-2 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-all"
					onClick={handleMaximize}
				>
					<Square className="w-4 h-4" />
				</button>
				<button
					type="button"
					id={closeButtonId}
					title="close"
					className="h-max cursor-pointer border rounded-lg p-2 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-all"
					onClick={handleClose}
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	)
}

TitleBar.displayName = 'TitleBar'
