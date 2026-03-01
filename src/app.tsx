import { Toaster } from 'sonner'
import { TitleBar } from '@/components/window/title-bar'
import { Home } from '@/pages/Home'
import '@/styles/global.css'
import { ThemeProvider } from '@/components/theme-provider'

export function App() {
	return (
		<ThemeProvider defaultTheme="dark">
			<Toaster />
			<div className="relative w-full h-screen overflow-hidden flex flex-col">
				<TitleBar />
				<div className="flex-1 overflow-hidden">
					<Home />
				</div>
			</div>
		</ThemeProvider>
	)
}
