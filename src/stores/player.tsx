import { create } from 'zustand'
import { DEFAULT_VOLUME } from '@/constants/audio'

interface PlayerStore {
	currentTrack: AudioFile | null
	isPlaying: boolean
	currentTime: number
	duration: number
	volume: number
	repeatMode: 'none' | 'one' | 'all'
	selectedFolder: string
	scrollPercentage: number
	view: 'list' | 'grid'
}

export const usePlayerStore = create<PlayerStore>(() => ({
	currentTrack: null,
	isPlaying: false,
	currentTime: 0,
	duration: 0,
	volume: DEFAULT_VOLUME,
	repeatMode: 'none',
	selectedFolder: '',
	scrollPercentage: 0,
	view: 'list',
}))
