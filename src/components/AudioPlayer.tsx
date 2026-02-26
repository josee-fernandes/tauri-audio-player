import { convertFileSrc } from '@tauri-apps/api/core'
import { audioDir } from '@tauri-apps/api/path'
import { readDir, readFile } from '@tauri-apps/plugin-fs'
import clsx from 'clsx'
import Lenis from 'lenis'
import {
	FolderOpen,
	LayoutGrid,
	LayoutList,
	Pause,
	Play,
	Repeat,
	Repeat1,
	SkipBack,
	SkipForward,
	SlidersHorizontal,
	SquareStop,
	Volume2,
	X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AUDIO_EXTENSIONS, DEFAULT_VOLUME } from '@/constants/audio'

const EQ_STORAGE_KEY = 'audio-player-eq-settings'

type EqBand = {
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

export const AudioPlayer: React.FC = () => {
	const [defaultAudioDir, setDefaultAudioDir] = useState<string>('')
	const [directories, setDirectories] = useState<Directory[]>([])
	const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
	const [currentTrack, setCurrentTrack] = useState<AudioFile | null>(null)
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [volume, setVolume] = useState(DEFAULT_VOLUME)
	const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none')
	const [selectedFolder, setSelectedFolder] = useState<string>('')
	const [scrollPercentage, setScrollPercentage] = useState(0)
	const [view, setView] = useState<'list' | 'grid'>('list')

	const [eqBands, setEqBands] = useState<EqBand[]>(() => {
		if (typeof window === 'undefined') return defaultEqBands
		try {
			const stored = window.localStorage.getItem(EQ_STORAGE_KEY)
			if (!stored) return defaultEqBands
			const parsed = JSON.parse(stored) as EqBand[]
			return parsed.length ? parsed : defaultEqBands
		} catch {
			return defaultEqBands
		}
	})

	const [isEqOpen, setIsEqOpen] = useState(false)

	const audioRef = useRef<HTMLAudioElement>(null)

	const listWrapperRef = useRef<HTMLDivElement | null>(null)
	const listContentRef = useRef<HTMLDivElement | null>(null)
	const lenisRef = useRef<Lenis | null>(null)

	const audioContextRef = useRef<AudioContext | null>(null)
	const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
	const eqFiltersRef = useRef<BiquadFilterNode[]>([])
	const eqGainRef = useRef<GainNode | null>(null)
	const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null)
	const bufferStartTimeRef = useRef(0)
	const bufferStartOffsetRef = useRef(0)
	const useBufferModeRef = useRef(false)
	const eqBufferModeRef = useRef(false)
	const timeUpdateRef = useRef<number | null>(null)

	const loadAudioFiles = useCallback(async (folderPath: string) => {
		try {
			const entries = await readDir(folderPath)
			const directoriesWithPath = entries
				.filter((entry) => entry.isDirectory)
				.map((entry) => ({ ...entry, path: `${folderPath}\\${entry.name}` }))
			const audioFiles = entries
				.filter((entry) => entry.isFile && AUDIO_EXTENSIONS.some((ext) => entry.name?.toLowerCase().endsWith(ext)))
				.map((entry) => ({
					name: entry.name,
					path: `${folderPath}\\${entry.name}`,
				}))

			setDirectories(directoriesWithPath)
			setAudioFiles(audioFiles)
		} catch (error) {
			toast.error('Load audio files error', { description: error as string })
			throw error
		}
	}, [])

	const handleParentDirectory = () => {
		try {
			const parentPath = selectedFolder.split('\\').slice(0, -1).join('\\')

			if (parentPath) {
				handleOpenDirectory(parentPath)
			}
		} catch (error) {
			toast.error('Parent directory error', { description: error as string })
		}
	}

	const handleOpenDirectory = useCallback(
		async (directoryPath: string) => {
			try {
				await loadAudioFiles(directoryPath)
				setSelectedFolder(directoryPath)
			} catch (error) {
				toast.error('Open directory error', { description: error as string })
			}
		},
		[loadAudioFiles],
	)

	const setupEqGraph = useCallback(() => {
		const audioElement = audioRef.current
		if (!audioElement) return

		// Com protocolo de asset do Tauri (asset.localhost), o navegador aplica CORS ao usar
		// MediaElementAudioSourceNode e o áudio sai em silêncio. Não criar o grafo nesse caso.
		if (audioElement.src?.includes('asset.localhost')) {
			return
		}

		if (!audioContextRef.current) {
			audioContextRef.current = new AudioContext()
		}

		const ctx = audioContextRef.current

		if (!sourceRef.current) {
			sourceRef.current = ctx.createMediaElementSource(audioElement)
		}

		eqFiltersRef.current.forEach((node) => {
			node.disconnect()
		})
		eqFiltersRef.current = []

		const filters = eqBands.map((band) => {
			const filter = ctx.createBiquadFilter()
			filter.type = band.type
			filter.frequency.value = band.frequency
			filter.gain.value = band.gain
			filter.Q.value = band.q
			return filter
		})

		if (filters.length > 0) {
			sourceRef.current.disconnect()
			sourceRef.current.connect(filters[0])

			for (let i = 0; i < filters.length - 1; i += 1) {
				filters[i].connect(filters[i + 1])
			}

			filters[filters.length - 1].connect(ctx.destination)
		} else {
			sourceRef.current.disconnect()
			sourceRef.current.connect(ctx.destination)
		}

		eqFiltersRef.current = filters

		if (ctx.state === 'suspended') {
			ctx.resume()
		}
	}, [eqBands])

	const nextTrackRef = useRef<(() => void) | null>(null)
	const repeatModeRef = useRef<'none' | 'one' | 'all'>('none')

	const ensureEqContextAndFiltersForBuffer = useCallback(() => {
		if (!audioContextRef.current) {
			audioContextRef.current = new AudioContext()
		}
		const ctx = audioContextRef.current
		if (ctx.state === 'suspended') {
			ctx.resume()
		}

		eqFiltersRef.current.forEach((node) => {
			node.disconnect()
		})
		eqFiltersRef.current = []
		eqGainRef.current?.disconnect()

		const filters = eqBands.map((band) => {
			const filter = ctx.createBiquadFilter()
			filter.type = band.type
			filter.frequency.value = band.frequency
			filter.gain.value = band.gain
			filter.Q.value = band.q
			return filter
		})

		const gainNode = ctx.createGain()
		gainNode.gain.value = volume
		eqGainRef.current = gainNode

		if (filters.length > 0) {
			for (let i = 0; i < filters.length - 1; i += 1) {
				filters[i].connect(filters[i + 1])
			}
			filters[filters.length - 1].connect(gainNode)
		}
		gainNode.connect(ctx.destination)
		eqFiltersRef.current = filters
	}, [eqBands, volume])

	const loadAndPlayBuffer = useCallback(
		async (track: AudioFile, startOffset: number) => {
			try {
				const bytes = await readFile(track.path)
				const arrayBuffer =
					bytes.byteLength === bytes.buffer.byteLength
						? bytes.buffer
						: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)

				if (!audioContextRef.current) {
					audioContextRef.current = new AudioContext()
				}
				const ctx = audioContextRef.current
				if (ctx.state === 'suspended') {
					await ctx.resume()
				}

				const audioBuffer = await ctx.decodeAudioData(
					arrayBuffer.slice(0) as ArrayBuffer,
				)
				ensureEqContextAndFiltersForBuffer()
				const filters = eqFiltersRef.current
				if (filters.length === 0) return

				bufferSourceRef.current?.stop()
				const source = ctx.createBufferSource()
				source.buffer = audioBuffer
				source.connect(filters[0])
				source.onended = () => {
					bufferSourceRef.current = null
					eqBufferModeRef.current = false
					const mode = repeatModeRef.current
					if (mode === 'one') {
						void loadAndPlayBuffer(track, 0)
					} else if (mode === 'all') {
						nextTrackRef.current?.()
					} else {
						setIsPlaying(false)
					}
				}
				source.start(0, startOffset)
				bufferSourceRef.current = source
				bufferStartTimeRef.current = ctx.currentTime
				bufferStartOffsetRef.current = startOffset
				setDuration(audioBuffer.duration)
				setCurrentTime(startOffset)
				setIsPlaying(true)
				eqBufferModeRef.current = true
			} catch (err) {
				toast.error('Erro ao carregar áudio para o equalizador', { description: String(err) })
			}
		},
		[ensureEqContextAndFiltersForBuffer],
	)

	const openEq = useCallback(() => {
		useBufferModeRef.current = true
		if (currentTrack && isPlaying && audioRef.current && audioRef.current.src?.includes('asset.localhost')) {
			const offset = audioRef.current.currentTime
			audioRef.current.pause()
			setIsPlaying(false)
			loadAndPlayBuffer(currentTrack, offset)
		} else if (!sourceRef.current && audioRef.current && !audioRef.current.src?.includes('asset.localhost')) {
			setupEqGraph()
			const ctx = audioContextRef.current
			if (ctx?.state === 'suspended') {
				ctx.resume()
			}
		}
		setIsEqOpen(true)
	}, [setupEqGraph, currentTrack, isPlaying, loadAndPlayBuffer])

	const playTrack = useCallback(
		(track: AudioFile) => {
			setCurrentTrack(track)

			if (useBufferModeRef.current) {
				void loadAndPlayBuffer(track, 0)
				return
			}

			if (audioRef.current) {
				try {
					const localAudioSrc = convertFileSrc(track.path)
					audioRef.current.src = localAudioSrc
					audioRef.current.volume = volume
					audioRef.current.play()
					setIsPlaying(true)
				} catch (error) {
					toast.error('Play track error', { description: error as string })
				}
			}
		},
		[volume, loadAndPlayBuffer],
	)

	const togglePlayPause = useCallback(() => {
		if (eqBufferModeRef.current && currentTrack) {
			const ctx = audioContextRef.current
			const source = bufferSourceRef.current
			if (isPlaying && source && ctx) {
				bufferStartOffsetRef.current =
					bufferStartOffsetRef.current + (ctx.currentTime - bufferStartTimeRef.current)
				source.stop()
				bufferSourceRef.current = null
				setIsPlaying(false)
			} else if (!isPlaying && currentTrack) {
				void loadAndPlayBuffer(currentTrack, bufferStartOffsetRef.current)
			}
			return
		}
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause()
			} else {
				audioRef.current.play()
			}
			setIsPlaying((oldIsPlaying) => !oldIsPlaying)
		}
	}, [isPlaying, currentTrack, loadAndPlayBuffer])

	const stopTrack = useCallback(() => {
		if (eqBufferModeRef.current) {
			bufferSourceRef.current?.stop()
			bufferSourceRef.current = null
			eqBufferModeRef.current = false
			setIsPlaying(false)
			setCurrentTime(0)
			return
		}
		if (audioRef.current) {
			audioRef.current.pause()
			audioRef.current.currentTime = 0
			setIsPlaying(false)
			setCurrentTime(0)
		}
	}, [])

	const handleSeek = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const time = parseFloat(e.target.value)

			if (eqBufferModeRef.current && currentTrack) {
				bufferStartOffsetRef.current = time
				bufferSourceRef.current?.stop()
				void loadAndPlayBuffer(currentTrack, time)
				return
			}
			if (audioRef.current) {
				audioRef.current.currentTime = time
				setCurrentTime(time)
			}
		},
		[currentTrack, loadAndPlayBuffer],
	)

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = parseFloat(e.target.value)

		setVolume(newVolume)

		if (eqGainRef.current) {
			eqGainRef.current.gain.value = newVolume
		}
		if (audioRef.current) {
			audioRef.current.volume = newVolume
		}
	}

	const nextTrack = useCallback(() => {
		if (currentTrack && audioFiles.length > 0) {
			const currentIndex = audioFiles.findIndex((file) => file.path === currentTrack.path)
			const nextIndex = (currentIndex + 1) % audioFiles.length

			playTrack(audioFiles[nextIndex])
		}
	}, [currentTrack, audioFiles, playTrack])

	nextTrackRef.current = nextTrack
	repeatModeRef.current = repeatMode

	const previousTrack = () => {
		if (currentTrack && audioFiles.length > 0) {
			const currentIndex = audioFiles.findIndex((file) => file.path === currentTrack.path)
			const prevIndex = currentIndex === 0 ? audioFiles.length - 1 : currentIndex - 1

			playTrack(audioFiles[prevIndex])
		}
	}

	const toggleRepeat = () => {
		setRepeatMode((prev) => {
			switch (prev) {
				case 'none':
					return 'all'
				case 'all':
					return 'one'
				case 'one':
					return 'none'
				default:
					return 'none'
			}
		})
	}

	const formatTime = (time: number) => {
		const minutes = Math.floor(time / 60)
		const seconds = Math.floor(time % 60)

		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}

	useEffect(() => {
		const audio = audioRef.current

		if (!audio) return

		const handleTimeUpdate = () => {
			if (!eqBufferModeRef.current) setCurrentTime(audio.currentTime)
		}
		const handleLoadedMetadata = () => {
			if (!eqBufferModeRef.current) setDuration(audio.duration)
		}
		const handleEnded = () => {
			if (eqBufferModeRef.current) return
			if (repeatMode === 'one') {
				audio.currentTime = 0
				audio.play()
			} else if (repeatMode === 'all') {
				nextTrack()
			} else {
				setIsPlaying(false)
			}
		}

		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('loadedmetadata', handleLoadedMetadata)
		audio.addEventListener('ended', handleEnded)

		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
			audio.removeEventListener('ended', handleEnded)
		}
	}, [repeatMode, nextTrack])

	useEffect(() => {
		if (!isPlaying) return
		const tick = () => {
			if (!eqBufferModeRef.current) return
			const ctx = audioContextRef.current
			if (!ctx) return
			const t = bufferStartOffsetRef.current + (ctx.currentTime - bufferStartTimeRef.current)
			setCurrentTime(t)
			timeUpdateRef.current = requestAnimationFrame(tick)
		}
		timeUpdateRef.current = requestAnimationFrame(tick)
		return () => {
			if (timeUpdateRef.current !== null) {
				cancelAnimationFrame(timeUpdateRef.current)
				timeUpdateRef.current = null
			}
		}
	}, [isPlaying])

	// biome-ignore lint/correctness/useExhaustiveDependencies: needed to destroy and create the lenis instance
	useEffect(() => {
		if (!listWrapperRef.current || !listContentRef.current) return

		lenisRef.current?.destroy()

		lenisRef.current = new Lenis({
			wrapper: listWrapperRef.current,
			content: listContentRef.current,
			autoRaf: true,
			smoothWheel: true,
			wheelMultiplier: 1,
		})

		lenisRef.current?.on('scroll', (e) => {
			setScrollPercentage(Math.round(e.progress * 100))
		})

		return () => {
			lenisRef.current?.destroy()
			lenisRef.current = null
		}
	}, [selectedFolder, audioFiles.length])

	// biome-ignore lint/correctness/useExhaustiveDependencies: should only run once
	useEffect(() => {
		audioDir().then((response) => {
			setDefaultAudioDir(response)
			handleOpenDirectory(response)
		})
	}, [])

	useEffect(() => {
		try {
			window.localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(eqBands))
		} catch {
			// ignora erros de storage
		}
	}, [eqBands])

	useEffect(() => {
		const ctx = audioContextRef.current
		const filters = eqFiltersRef.current
		if (!ctx || filters.length === 0) return

		eqBands.forEach((band, index) => {
			const filter = filters[index]
			if (!filter) return
			filter.gain.value = band.gain
			filter.frequency.value = band.frequency
			filter.Q.value = band.q
			filter.type = band.type
		})
	}, [eqBands])

	useEffect(() => {
		return () => {
			timeUpdateRef.current !== null && cancelAnimationFrame(timeUpdateRef.current)
			bufferSourceRef.current?.stop()
			eqFiltersRef.current.forEach((f) => {
				f.disconnect()
			})
			eqGainRef.current?.disconnect()
			sourceRef.current?.disconnect()
			audioContextRef.current?.close().catch(() => {})
		}
	}, [])

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<header className="p-4 border-b border-zinc-900 flex justify-between items-end">
				<div className="flex flex-col justify-center gap-2">
					{selectedFolder && (
						<p className="mt-2 text-sm text-zinc-500 font-bold">Pasta atual: {selectedFolder.split('/').pop()}</p>
					)}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setView('list')}
							className={clsx(
								'p-2 bg-transparent border-2 border-zinc-900 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer',
								{
									'bg-indigo-600! hover:bg-indigo-700! border-indigo-600!': view === 'list',
								},
							)}
						>
							<LayoutList className="size-4 text-zinc-50" />
						</button>
						<button
							type="button"
							onClick={() => setView('grid')}
							className={clsx(
								'p-2 bg-transparent border-2 border-zinc-900 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer',
								{
									'bg-indigo-600! hover:bg-indigo-700! border-indigo-600!': view === 'grid',
								},
							)}
						>
							<LayoutGrid className="size-4 text-zinc-50" />
						</button>
					</div>
				</div>
				<div>
					<div className="flex flex-col gap-2 w-20">
						<span className="text-right font-bold text-zinc-500">{scrollPercentage}</span>
						<div className="relative rounded-lg overflow-hidden">
							<div className="absolute h-2 bg-indigo-600 z-10 rounded-lg" style={{ width: `${scrollPercentage}%` }} />
							<div className="h-2 w-full bg-zinc-900 rounded-lg" />
						</div>
					</div>
				</div>
			</header>

			{/* File List */}
			<div ref={listWrapperRef} className="relative flex-1 p-4 overflow-hidden">
				<div
					ref={listContentRef}
					className={clsx({
						'flex flex-col gap-1': view === 'list',
						'grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-1':
							view === 'grid',
					})}
				>
					{selectedFolder !== defaultAudioDir && (
						<button
							onDoubleClick={handleParentDirectory}
							type="button"
							className="relative w-full text-left p-3 rounded-lg cursor-pointer transition-colors border-2 bg-transparent border-indigo-800 hover:bg-indigo-600/50"
						>
							<div className="flex items-center gap-3">
								<span className="text-sm text-zinc-50 w-8 font-bold">
									<FolderOpen className="size-4 text-zinc-50" />
								</span>
								<span className="flex-1 truncate text-zinc-50">..</span>
							</div>
						</button>
					)}
					{directories?.map((directory) => (
						<button
							key={directory.path}
							onDoubleClick={() => handleOpenDirectory(directory.path)}
							type="button"
							className="relative w-full text-left p-3 rounded-lg cursor-pointer transition-colors border-2 bg-transparent border-indigo-800 hover:bg-indigo-600/50"
						>
							<div className="flex items-center gap-3">
								<span className="text-sm text-zinc-50 w-8 font-bold">
									<FolderOpen className="size-4 text-zinc-50" />
								</span>
								<span className="flex-1 truncate text-zinc-50">{directory.name}</span>
							</div>
						</button>
					))}
					{audioFiles?.map((file, index) => (
						<button
							key={file.path}
							onDoubleClick={() => playTrack(file)}
							type="button"
							className={clsx(
								'relative w-full text-left p-3 rounded-lg cursor-pointer transition-colors border-2 bg-transparent border-zinc-900 hover:bg-zinc-900/50 ',
								{
									'bg-indigo-600! border-indigo-600! text-zinc-50!': currentTrack?.path === file.path,
								},
							)}
						>
							<div className="flex items-center gap-3">
								<span
									className={clsx('text-sm text-zinc-500 w-8', {
										'text-zinc-50! font-bold': currentTrack?.path === file.path,
									})}
								>
									{index + 1}
								</span>
								<span
									className={clsx('flex-1 truncate', {
										'text-zinc-50! font-bold': currentTrack?.path === file.path,
									})}
								>
									{file.name.replace(/\.[^/.]+$/, '')}
								</span>
								{currentTrack?.path === file.path && isPlaying && (
									<div className="relative">
										<div className="w-2 h-2 bg-white rounded-full animate-ping " />
										<div className="absolute inset-0 w-2 h-2 bg-white rounded-full animate-pulse" />
									</div>
								)}
							</div>
						</button>
					))}
				</div>
			</div>

			{/* Controls */}
			{currentTrack && (
				<div className="border-t border-zinc-900 p-4 space-y-4 border">
					{/* Progress Bar */}
					<div className="space-y-2">
						<div className="flex justify-between text-sm text-zinc-500">
							<span>{formatTime(currentTime)}</span>
							<span>{formatTime(duration)}</span>
						</div>
						<div className="relative">
							<div
								className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-indigo-600 animate-gradient-cycle rounded-lg z-10 transition-all after:content-[''] after:block after:w-3 after:h-3 after:absolute after:-top-0.5 after:-right-1.5 after:bg-zinc-50 after:rounded-full gradient-cycle"
								style={{ width: `${(currentTime / duration) * 100}%` }}
							/>
							<div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-zinc-900 rounded-lg w-full" />

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
						<button
							type="button"
							onClick={previousTrack}
							className="p-2 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
						>
							<SkipBack className="size-4 text-zinc-50 fill-zinc-50" />
						</button>

						<button
							type="button"
							onClick={togglePlayPause}
							className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
						>
							{isPlaying ? (
								<Pause className="size-4 text-zinc-50 fill-zinc-50" />
							) : (
								<Play className="size-4 text-zinc-50 fill-zinc-50" />
							)}
						</button>

						<button
							type="button"
							onClick={stopTrack}
							className="p-2 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
						>
							<SquareStop className="size-4 text-zinc-50 fill-zinc-50" />
						</button>

						<button
							type="button"
							onClick={nextTrack}
							className="p-2 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
						>
							<SkipForward className="size-4 text-zinc-50 fill-zinc-50" />
						</button>
					</div>

					{/* Secondary Controls */}
					<div className="flex items-center justify-between">
						{/* Repeat Button */}
						<button
							type="button"
							onClick={toggleRepeat}
							className={clsx(
								'p-2 rounded-lg transition-colors cursor-pointer',
								repeatMode !== 'none' ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-900',
							)}
						>
							{repeatMode === 'one' ? (
								<Repeat1 className="size-4 text-zinc-50" />
							) : (
								<Repeat className="size-4 text-zinc-50" />
							)}
						</button>

						<div className="flex items-center gap-4">
							{/* EQ Button */}
							<button
								type="button"
								onClick={openEq}
								className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-zinc-900"
								title="Equalizador"
							>
								<SlidersHorizontal className="size-4 text-zinc-50" />
							</button>

							{/* Volume Control */}
							<div className="flex items-center gap-2">
								<Volume2 className="size-4 text-zinc-50" />
								<div className="relative w-48">
									<div
										className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-indigo-600 rounded-lg z-10 transition-all after:content-[''] after:block after:w-3 after:h-3 after:-top-0.5 after:absolute after:-right-1.5 after:bg-zinc-50 after:rounded-full"
										style={{ width: `${Math.round(volume * 100)}%` }}
									/>
									<div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-zinc-900 rounded-lg w-full" />
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
								<span className="text-sm text-zinc-400 w-8">{Math.round(volume * 100)}%</span>
							</div>
						</div>
					</div>

					{/* Current Track Info */}
					<div className="text-center">
						<p className="font-medium truncate">{currentTrack.name.replace(/\.[^/.]+$/, '')}</p>
					</div>
				</div>
			)}

			{/* Equalizer Modal */}
			{isEqOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
					<div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-zinc-50">Equalizador</h2>
							<button
								type="button"
								onClick={() => setIsEqOpen(false)}
								className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
								aria-label="Fechar"
							>
								<X className="size-5" />
							</button>
						</div>

						<div className="space-y-4">
							{eqBands.map((band, index) => (
								<div key={`${band.frequency}-${index}`} className="flex flex-col gap-1">
									<div className="flex items-center justify-between text-xs text-zinc-400">
										<span>{band.frequency >= 1000 ? `${band.frequency / 1000}k` : band.frequency} Hz</span>
										<span>{band.gain >= 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1)} dB</span>
									</div>
									<div className="relative">
										<div
											className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-indigo-600 rounded-lg z-10 transition-all"
											style={{
												width: `${((band.gain + 12) / 24) * 100}%`,
											}}
										/>
										<div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-zinc-900 rounded-lg w-full" />
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
							<button
								type="button"
								onClick={() => setEqBands([...defaultEqBands])}
								className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
							>
								Resetar EQ
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Hidden Audio Element */}
			<audio ref={audioRef}>
				<track kind="captions" />
			</audio>
		</div>
	)
}

AudioPlayer.displayName = 'AudioPlayer'
