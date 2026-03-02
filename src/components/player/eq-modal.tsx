import { RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { defaultEqBands, usePlayerStore } from '@/stores/player'

export function EqModal() {
	const isEqOpen = usePlayerStore((state) => state.isEqOpen)
	const setIsEqOpen = usePlayerStore((state) => state.setIsEqOpen)
	const eqBands = usePlayerStore((state) => state.eqBands)
	const setEqBands = usePlayerStore((state) => state.setEqBands)

	if (!isEqOpen) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-xs">
			<div className="bg-background border rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-foreground">Equalizador</h2>
					<Button variant="ghost" size="icon-sm" aria-label="Fechar" onClick={() => setIsEqOpen(false)}>
						<X className="size-4" />
					</Button>
				</div>

				<div className="flex flex-col gap-4">
					{eqBands.map((band, index) => (
						<div key={`${band.frequency}-${index}`} className="flex flex-col gap-1">
							<div className="flex items-center justify-between text-xs text-muted-foreground">
								<span>{band.frequency >= 1000 ? `${band.frequency / 1000}k` : band.frequency} Hz</span>
								<span>{band.gain >= 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1)} dB</span>
							</div>
							<div className="relative">
								<div
									className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-primary rounded-lg z-10 transition-all"
									style={{
										width: `${((band.gain + 12) / 24) * 100}%`,
									}}
								/>
								<div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-muted rounded-lg w-full" />
								<input
									type="range"
									min={-12}
									max={12}
									step={0.1}
									value={band.gain}
									onChange={(e) => {
										const newGain = Number(e.target.value)
										setEqBands((prev) => prev.map((b, i) => (i === index ? { ...b, gain: newGain } : b)))
									}}
									className="absolute left-0 top-1/2 -translate-y-1/2 w-full rounded-lg appearance-none cursor-pointer slider z-20 opacity-0"
								/>
							</div>
						</div>
					))}
				</div>

				<div className="mt-4 flex justify-end">
					<Button variant="secondary" onClick={() => setEqBands([...defaultEqBands])}>
						<RotateCcw className="size-4" />
						Resetar EQ
					</Button>
				</div>
			</div>
		</div>
	)
}
