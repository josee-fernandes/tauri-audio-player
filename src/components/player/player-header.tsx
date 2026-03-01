import { LayoutGrid, LayoutList } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface PlayerHeaderProps {
	selectedFolder: string
	view: 'list' | 'grid'
	setView: (view: 'list' | 'grid') => void
	scrollPercentage: number
}

export function PlayerHeader({ selectedFolder, view, setView, scrollPercentage }: PlayerHeaderProps) {
	return (
		<header className="p-4 border-b flex justify-between items-end">
			<div className="flex flex-col justify-center gap-2">
				{selectedFolder && (
					<p className="mt-2 text-sm text-muted-foreground">Pasta atual: {selectedFolder.split('/').pop()}</p>
				)}
				<div className="flex items-center gap-2">
					<Button variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')}>
						<LayoutList className="size-4" />
					</Button>
					<Button variant={view === 'grid' ? 'default' : 'outline'} onClick={() => setView('grid')}>
						<LayoutGrid className="size-4" />
					</Button>
				</div>
			</div>
			<div>
				<div className="flex flex-col gap-2 w-20">
					<span className="text-right font-bold text-muted-foreground">{scrollPercentage}</span>
					<div className="relative rounded-lg overflow-hidden">
						<div className="absolute h-2 bg-primary z-10 rounded-lg" style={{ width: `${scrollPercentage}%` }} />
						<div className="h-2 w-full bg-muted rounded-lg" />
					</div>
				</div>
			</div>
		</header>
	)
}
