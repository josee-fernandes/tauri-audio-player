import { getCurrentWindow } from '@tauri-apps/api/window'
import { useMemo } from 'react'

import '@/styles/window.css'
import { Minus, Square, X } from 'lucide-react'
import { ThemeToggler } from '@/components/theme-toggler'
import { Button } from '@/components/ui/button'
// import { LocalStorage } from '../local-storage'
import { Logo } from '../logo'

export function TitleBar() {
	// const [open, setOpen] = useState(false)

	const appWindow = useMemo(() => getCurrentWindow(), [])

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
		<div className="select-none flex justify-between items-center">
			<div className="py-4 pl-2 flex items-center gap-2">
				<Logo />
			</div>
			<div data-tauri-drag-region className="flex-1 h-full" />
			<div className="py-2 pr-2 flex gap-2">
				{/* <Button variant="outline" size="icon-sm" title="Local Storage" onClick={() => setOpen(!open)}>
					<Database className="size-4" />
				</Button>
				{open && <LocalStorage open={open} setOpen={setOpen} />} */}
				<ThemeToggler />
				<Button variant="outline" size="icon-sm" title="minimize" onClick={handleMinimize}>
					<Minus className="size-4" />
				</Button>
				<Button variant="outline" size="icon-sm" title="maximize" onClick={handleMaximize}>
					<Square className="size-4" />
				</Button>
				<Button variant="outline" size="icon-sm" title="close" onClick={handleClose}>
					<X className="size-4" />
				</Button>
			</div>
		</div>
	)
}
