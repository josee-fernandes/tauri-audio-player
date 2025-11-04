import { Toaster } from 'sonner'
import { TitleBar } from '@/components/Window/TitleBar'
import { Home } from '@/pages/Home'
import '@/styles/global.css'

export const App: React.FC = () => {
	return (
		<>
			<Toaster />
			<div className="relative w-full h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex flex-col">
				<div className="absolute left-0 top-0 w-full h-full bg-white z-9999 animate-slide [animation-delay:100ms]" />
				<div className="absolute left-0 top-0 w-full h-full bg-amber-500 z-9998 animate-slide [animation-delay:200ms]" />
				<div className="absolute left-0 top-0 w-full h-full bg-pink-500 z-9997 animate-slide [animation-delay:300ms]" />
				<div className="absolute left-0 top-0 w-full h-full bg-cyan-500 z-9996 animate-slide [animation-delay:400ms]" />
				<div className="absolute left-0 top-0 w-full h-full bg-emerald-500 z-9995 animate-slide [animation-delay:500ms]" />
				<TitleBar />
				<div className="flex-1 overflow-hidden">
					<Home />
				</div>
			</div>
		</>
	)
}

App.displayName = 'App'
