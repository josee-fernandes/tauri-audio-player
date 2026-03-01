import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function LocalStorage({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
	const [localStorage, setLocalStorage] = useState<Storage | null>(null)

	const data = localStorage
		? Object.entries(localStorage).map(([key, value]) => {
				try {
					return { key, value: JSON.parse(value) }
				} catch {
					return { key, value }
				}
			})
		: []

	const handleClear = useCallback(() => {
		window.localStorage.clear()
		localStorage?.clear()
		setLocalStorage(null)
	}, [localStorage])

	useEffect(() => {
		if (!localStorage) setLocalStorage(window.localStorage)
	}, [localStorage])

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Local Storage Data</DialogTitle>
				</DialogHeader>
				<div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4 flex flex-col gap-10">
					{data.length === 0 && <p className="text-center text-sm text-muted-foreground">Nenhum dado encontrado</p>}
					{data.map((item) => (
						<div key={item.key}>
							<p className="mb-4 font-bold flex items-center gap-2">
								<span className="size-2 bg-primary block rounded-full" />
								{item.key}
							</p>
							<pre>{JSON.stringify(item.value, null, 2)}</pre>
						</div>
					))}
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Fechar</Button>
					</DialogClose>
					<Button onClick={handleClear}>Limpar Dados</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
