import { Toaster } from 'sonner'
import { TitleBar } from '@/components/Window/TitleBar'
import { Home } from '@/pages/Home'

export const App: React.FC = () => {
	return (
		<>
			<Toaster />
			<div className="w-full h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex flex-col">
				<TitleBar />
				<div className="flex-1 overflow-hidden">
					<Home />
				</div>
			</div>
		</>
	)
}

App.displayName = 'App'
