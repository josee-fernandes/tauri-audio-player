import { type RefObject, useCallback, useEffect, useRef } from 'react'
import { defaultEqBands, usePlayerStore } from '@/stores/player'

export function useAudioEngine(audioRef: RefObject<HTMLAudioElement | null>) {
	// Get EQ bands from store - this will re-run the effect when EQ changes
	const eqBands = usePlayerStore((state) => state.eqBands)
	const volume = usePlayerStore((state) => state.volume)
	const muted = usePlayerStore((state) => state.muted)

	// Refs for Web Audio API nodes - created once and reused
	const audioContextRef = useRef<AudioContext | null>(null)
	const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
	const filterNodesRef = useRef<BiquadFilterNode[]>([])

	// Initialize or get AudioContext
	const getAudioContext = useCallback(() => {
		if (!audioContextRef.current) {
			audioContextRef.current = new AudioContext()
			console.log('[AudioEngine] AudioContext created, state:', audioContextRef.current.state)
		}
		return audioContextRef.current
	}, [])

	// Initialize the audio graph (source -> filters -> destination)
	const initAudioGraph = useCallback(() => {
		const audioElement = audioRef.current
		if (!audioElement) {
			console.warn('[AudioEngine] No audio element available')
			return false
		}

		const ctx = getAudioContext()

		// If already initialized, just return success
		if (sourceNodeRef.current && filterNodesRef.current.length > 0) {
			console.log('[AudioEngine] Audio graph already initialized')
			return true
		}

		// Create MediaElementAudioSourceNode only once per audio element
		// Note: createMediaElementSource can only be called once per audio element
		// IMPORTANT: This redirects the audio from the <audio> element to the Web Audio API
		if (!sourceNodeRef.current) {
			try {
				sourceNodeRef.current = ctx.createMediaElementSource(audioElement)
				console.log('[AudioEngine] MediaElementAudioSourceNode created')
			} catch (error) {
				// If it fails, the source might already be created (e.g., React Strict Mode)
				// or there might be an issue with the audio element
				console.warn('[AudioEngine] Failed to create MediaElementAudioSourceNode:', error)
				// Try to continue - maybe it was already created
				if (!sourceNodeRef.current) {
					return false
				}
			}
		}

		// Create BiquadFilter nodes for each EQ band (using default bands for initial setup)
		// The actual EQ values are updated in a separate effect
		const filters = defaultEqBands.map((band) => {
			const filter = ctx.createBiquadFilter()
			filter.type = band.type
			filter.frequency.value = band.frequency
			filter.gain.value = band.gain
			filter.Q.value = band.q
			return filter
		})

		// Store the filters for later updates
		filterNodesRef.current = filters

		// Connect the audio graph: source -> filter[0] -> filter[1] -> ... -> filter[n] -> destination
		if (filters.length > 0) {
			sourceNodeRef.current.connect(filters[0])

			for (let i = 0; i < filters.length - 1; i++) {
				filters[i].connect(filters[i + 1])
			}

			filters[filters.length - 1].connect(ctx.destination)
			console.log('[AudioEngine] Audio graph connected:', filters.length, 'filters')
		} else {
			// No filters, connect source directly to destination
			sourceNodeRef.current.connect(ctx.destination)
			console.log('[AudioEngine] Audio graph connected: direct (no filters)')
		}

		return true
	}, [audioRef, getAudioContext])

	// Function to resume AudioContext (must be called after user interaction)
	const resumeAudioContext = useCallback(async () => {
		const ctx = audioContextRef.current
		if (!ctx) {
			console.log('[AudioEngine] No AudioContext available')
			return
		}

		console.log('[AudioEngine] AudioContext state before resume:', ctx.state)

		if (ctx.state === 'suspended') {
			try {
				await ctx.resume()
				console.log('[AudioEngine] AudioContext resumed successfully')
			} catch (error) {
				console.error('[AudioEngine] Failed to resume AudioContext:', error)
			}
		} else {
			console.log('[AudioEngine] AudioContext already running')
		}
	}, [])

	// Combined function to ensure audio is ready (init + resume)
	const ensureAudioReady = useCallback(async () => {
		console.log('[AudioEngine] Ensuring audio is ready...')

		// Initialize the audio graph if not already done
		const initialized = initAudioGraph()
		if (!initialized) {
			console.error('[AudioEngine] Failed to initialize audio graph')
			return false
		}

		// Resume the AudioContext
		await resumeAudioContext()

		return true
	}, [initAudioGraph, resumeAudioContext])

	// Update EQ filter parameters when eqBands change (without recreating the graph)
	useEffect(() => {
		const filters = filterNodesRef.current
		if (filters.length === 0) return

		// Update each filter's parameters to match the current EQ settings
		eqBands.forEach((band, index) => {
			const filter = filters[index]
			if (!filter) return

			// Use setValueAtTime for smooth transitions
			const now = audioContextRef.current?.currentTime || 0

			// Update gain (the most commonly changed parameter)
			if (filter.gain.value !== band.gain) {
				filter.gain.setValueAtTime(band.gain, now)
			}

			// Update other parameters (usually static, but included for completeness)
			if (filter.frequency.value !== band.frequency) {
				filter.frequency.setValueAtTime(band.frequency, now)
			}
			if (filter.Q.value !== band.q) {
				filter.Q.setValueAtTime(band.q, now)
			}
			if (filter.type !== band.type) {
				filter.type = band.type
			}
		})
	}, [eqBands])

	// Sync audio element volume/mute with store state
	useEffect(() => {
		const audioElement = audioRef.current
		if (!audioElement) return

		audioElement.volume = volume
	}, [volume, audioRef])

	useEffect(() => {
		const audioElement = audioRef.current
		if (!audioElement) return

		audioElement.muted = muted
	}, [muted, audioRef])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			console.log('[AudioEngine] Cleaning up...')
			// Close AudioContext
			audioContextRef.current?.close().catch(() => {
				// Ignore close errors
			})
			audioContextRef.current = null
			sourceNodeRef.current = null
			filterNodesRef.current = []
		}
	}, [])

	return {
		audioContextRef,
		sourceNodeRef,
		filterNodesRef,
		resumeAudioContext,
		ensureAudioReady,
	}
}
