import {
	ChevronDown,
	Pause,
	Play,
	Repeat,
	Repeat1,
	SkipBack,
	SkipForward,
	SlidersVertical,
	Square,
	Volume1,
	Volume2,
	VolumeOff,
	VolumeX,
} from 'lucide-react'
import type { RefObject } from 'react'
import type { AudioFile } from '@/@types/audio'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePlayerStore } from '@/stores/player'

interface PlayerControlsProps {
	audioRef: RefObject<HTMLAudioElement | null>
	currentTrack: AudioFile
	isPlaying: boolean
	currentTime: number
	duration: number
	volume: number
	muted: boolean
	repeatMode: 'none' | 'one' | 'all'
	controlsHidden?: boolean
	formatTime: (time: number) => string
	previousTrack: () => void
	togglePlayPause: () => void
	stopTrack: () => void
	nextTrack: () => void
	handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void
	handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
	handleMuteToggle: () => void
	toggleControlsHidden: () => void
	cycleRepeatMode: () => void
}

export function PlayerControls({
	controlsHidden,
	currentTime,
	duration,
	formatTime,
	previousTrack,
	togglePlayPause,
	stopTrack,
	nextTrack,
	handleSeek,
	handleVolumeChange,
	isPlaying,
	repeatMode,
	volume,
	muted,
	toggleControlsHidden,
	cycleRepeatMode,
	handleMuteToggle,
	currentTrack,
}: PlayerControlsProps) {
	// Get EQ modal state from store
	const toggleEqOpen = usePlayerStore((state) => state.toggleEqOpen)

	return (
		<div className="relative border-t p-4 flex flex-col gap-4">
			<Button variant="ghost" onClick={toggleControlsHidden}>
				<ChevronDown className={cn('size-4 transition-all duration-400 ', { 'rotate-180': controlsHidden })} />
			</Button>
			{/* Progress Bar */}
			<div className="">
				<div className="flex justify-between text-sm text-muted-foreground">
					<span>{formatTime(currentTime)}</span>
					<span>{formatTime(duration)}</span>
				</div>
				<div className="mt-4 relative">
					<div
						className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-primary rounded-lg z-10 transition-all after:content-[''] after:block after:w-3 after:h-3 after:absolute after:-top-0.5 after:-right-1.5 after:bg-primary after:rounded-full"
						style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
					/>
					<div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-muted rounded-lg w-full" />

					<input
						type="range"
						min={0}
						max={duration || 0}
						value={currentTime}
						onChange={handleSeek}
						className="absolute left-0 top-1/2 -translate-y-1/2 w-full rounded-lg appearance-none cursor-pointer slider z-20 opacity-0"
					/>
				</div>
			</div>

			{/* Main Controls */}
			<div className="flex items-center justify-center gap-4 mt-6">
				<Button variant="ghost" size="icon-sm" onClick={previousTrack}>
					<SkipBack className="size-4" />
				</Button>

				<Button variant="ghost" size="icon-sm" onClick={togglePlayPause}>
					{isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
				</Button>

				<Button variant="ghost" size="icon-sm" onClick={stopTrack}>
					<Square className="size-4" />
				</Button>

				<Button variant="ghost" size="icon-sm" onClick={nextTrack}>
					<SkipForward className="size-4" />
				</Button>
			</div>

			{/* Secondary Controls */}
			<div className="flex items-center justify-between">
				{/* Repeat Button */}
				<Button variant={repeatMode === 'none' ? 'ghost' : 'default'} size="icon-sm" onClick={cycleRepeatMode}>
					{repeatMode === 'one' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
				</Button>

				<div className="flex items-center gap-4">
					{/* EQ Button */}
					<Button variant="ghost" size="icon-sm" title="Equalizador" onClick={toggleEqOpen}>
						<SlidersVertical className="size-4" />
					</Button>

					{/* Volume Control */}
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="icon-sm" onClick={handleMuteToggle}>
							{muted && <VolumeOff className="size-4" />}
							{!muted && volume === 0 && <VolumeX className="size-4" />}
							{!muted && volume > 0 && volume < 0.5 && <Volume1 className="size-4" />}
							{!muted && volume >= 0.5 && <Volume2 className="size-4" />}
						</Button>
						<div className="relative w-48">
							<div
								className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-primary rounded-lg z-10 transition-all after:content-[''] after:block after:w-3 after:h-3 after:-top-0.5 after:absolute after:-right-1.5 after:bg-primary after:rounded-full"
								style={{ width: `${Math.round(volume * 100)}%` }}
							/>
							<div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-muted rounded-lg w-full" />
							<input
								type="range"
								min={0}
								max={1}
								step={0.001}
								value={volume}
								onChange={handleVolumeChange}
								className="absolute left-0 top-1/2 -translate-y-1/2 w-full rounded-lg appearance-none cursor-pointer slider z-20 opacity-0"
							/>
						</div>
						<span className="text-sm text-muted-foreground w-8">{Math.round(volume * 100)}%</span>
					</div>
				</div>
			</div>

			{/* Current Track Info */}
			<div className="text-center text-sm">
				<p className="font-medium text-muted-foreground animate-marquee">
					{currentTrack.name.replace(/\.[^/.]+$/, '')}
				</p>
			</div>
		</div>
	)
}
