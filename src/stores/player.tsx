import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AudioFile } from '@/@types/audio'
import { DEFAULT_VOLUME } from '@/constants/audio'

export interface EqBand {
	frequency: number
	gain: number
	q: number
	type: BiquadFilterType
}

const defaultEqBands: EqBand[] = [
	{ frequency: 60, gain: 0, q: 1, type: 'lowshelf' },
	{ frequency: 230, gain: 0, q: 1, type: 'peaking' },
	{ frequency: 910, gain: 0, q: 1, type: 'peaking' },
	{ frequency: 3600, gain: 0, q: 1, type: 'peaking' },
	{ frequency: 14000, gain: 0, q: 1, type: 'highshelf' },
]

interface PlayerState {
	// Audio playback state (not persisted)
	currentTrack: AudioFile | null
	isPlaying: boolean
	currentTime: number
	duration: number
	scrollPercentage: number

	// Audio playback state (persisted)
	volume: number
	muted: boolean
	repeatMode: 'none' | 'one' | 'all'

	// View state (persisted)
	view: 'list' | 'grid'
	controlsHidden: boolean

	// EQ state (persisted)
	eqBands: EqBand[]
	isEqOpen: boolean

	// Folder state (persisted)
	selectedFolder: string
	lastOpenedFolder: string

	// Actions
	setCurrentTrack: (track: AudioFile | null) => void
	setIsPlaying: (isPlaying: boolean) => void
	setCurrentTime: (time: number) => void
	setDuration: (duration: number) => void
	setScrollPercentage: (percentage: number) => void

	setVolume: (volume: number) => void
	setMuted: (muted: boolean) => void
	toggleMuted: () => void

	setRepeatMode: (mode: 'none' | 'one' | 'all') => void
	cycleRepeatMode: () => void

	setView: (view: 'list' | 'grid') => void
	toggleView: () => void

	setControlsHidden: (hidden: boolean) => void
	toggleControlsHidden: () => void

	setEqBands: (bands: EqBand[] | ((prev: EqBand[]) => EqBand[])) => void
	updateEqBandGain: (index: number, gain: number) => void
	resetEqBands: () => void
	setIsEqOpen: (open: boolean) => void
	toggleEqOpen: () => void

	setSelectedFolder: (folder: string) => void
}

const STORAGE_KEY = 'audio-player-settings'

export const usePlayerStore = create<PlayerState>()(
	persist(
		(set) => ({
			// Initial state - non-persisted
			currentTrack: null,
			isPlaying: false,
			currentTime: 0,
			duration: 0,
			scrollPercentage: 0,

			// Initial state - persisted
			volume: DEFAULT_VOLUME,
			muted: false,
			repeatMode: 'none',

			view: 'list',
			controlsHidden: false,

			eqBands: defaultEqBands,
			isEqOpen: false,

			selectedFolder: '',
			lastOpenedFolder: '',

			// Actions - playback state
			setCurrentTrack: (track) => set({ currentTrack: track }),
			setIsPlaying: (isPlaying) => set({ isPlaying }),
			setCurrentTime: (time) => set({ currentTime: time }),
			setDuration: (duration) => set({ duration }),
			setScrollPercentage: (percentage) => set({ scrollPercentage: percentage }),

			// Actions - volume
			setVolume: (volume) => set({ volume }),
			setMuted: (muted) => set({ muted }),
			toggleMuted: () => set((state) => ({ muted: !state.muted })),

			// Actions - repeat mode
			setRepeatMode: (mode) => set({ repeatMode: mode }),
			cycleRepeatMode: () =>
				set((state) => {
					switch (state.repeatMode) {
						case 'none':
							return { repeatMode: 'all' }
						case 'all':
							return { repeatMode: 'one' }
						case 'one':
							return { repeatMode: 'none' }
						default:
							return { repeatMode: 'none' }
					}
				}),

			// Actions - view
			setView: (view) => set({ view }),
			toggleView: () => set((state) => ({ view: state.view === 'list' ? 'grid' : 'list' })),

			// Actions - controls visibility
			setControlsHidden: (hidden) => set({ controlsHidden: hidden }),
			toggleControlsHidden: () => set((state) => ({ controlsHidden: !state.controlsHidden })),

			// Actions - EQ
			setEqBands: (bands) =>
				set((state) => ({
					eqBands: typeof bands === 'function' ? bands(state.eqBands) : bands,
				})),
			updateEqBandGain: (index, gain) =>
				set((state) => ({
					eqBands: state.eqBands.map((band, i) => (i === index ? { ...band, gain } : band)),
				})),
			resetEqBands: () => set({ eqBands: [...defaultEqBands] }),
			setIsEqOpen: (open) => set({ isEqOpen: open }),
			toggleEqOpen: () => set((state) => ({ isEqOpen: !state.isEqOpen })),

			// Actions - folder
			setSelectedFolder: (folder) =>
				set({
					selectedFolder: folder,
					lastOpenedFolder: folder,
				}),
		}),
		{
			name: STORAGE_KEY,
			partialize: (state) => ({
				// Only persist these fields
				volume: state.volume,
				muted: state.muted,
				repeatMode: state.repeatMode,
				view: state.view,
				controlsHidden: state.controlsHidden,
				eqBands: state.eqBands,
				lastOpenedFolder: state.lastOpenedFolder,
			}),
		}
	)
)

// Re-export default EQ bands for use in components
export { defaultEqBands }
