import { useGSAP } from '@gsap/react'
import { audioDir } from '@tauri-apps/api/path'
import { readDir, readFile } from '@tauri-apps/plugin-fs'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { FolderOpen } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { AudioFile, Directory } from '@/@types/audio'
import { Button } from '@/components/ui/button'
import { AUDIO_EXTENSIONS } from '@/constants/audio'
import { useAudioEngine } from '@/hooks/use-audio-engine'
import { cn } from '@/lib/utils'
import { usePlayerStore } from '@/stores/player'
import { EqModal } from './player/eq-modal'
import { PlayerControls } from './player/player-controls'
import { PlayerHeader } from './player/player-header'

export function AudioPlayer() {
	// Audio element ref
	const audioRef = useRef<HTMLAudioElement>(null)

	// Initialize Web Audio API engine (creates AudioContext and EQ filters)
	const { ensureAudioReady } = useAudioEngine(audioRef)

	// Get state and actions from store
	const currentTrack = usePlayerStore((state) => state.currentTrack)
	const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack)
	const isPlaying = usePlayerStore((state) => state.isPlaying)
	const setIsPlaying = usePlayerStore((state) => state.setIsPlaying)
	const currentTime = usePlayerStore((state) => state.currentTime)
	const setCurrentTime = usePlayerStore((state) => state.setCurrentTime)
	const duration = usePlayerStore((state) => state.duration)
	const setDuration = usePlayerStore((state) => state.setDuration)
	const volume = usePlayerStore((state) => state.volume)
	const setVolume = usePlayerStore((state) => state.setVolume)
	const muted = usePlayerStore((state) => state.muted)
	const toggleMuted = usePlayerStore((state) => state.toggleMuted)
	const repeatMode = usePlayerStore((state) => state.repeatMode)
	const cycleRepeatMode = usePlayerStore((state) => state.cycleRepeatMode)
	const selectedFolder = usePlayerStore((state) => state.selectedFolder)
	const setSelectedFolder = usePlayerStore((state) => state.setSelectedFolder)
	const lastOpenedFolder = usePlayerStore((state) => state.lastOpenedFolder)
	const scrollPercentage = usePlayerStore((state) => state.scrollPercentage)
	const setScrollPercentage = usePlayerStore((state) => state.setScrollPercentage)
	const view = usePlayerStore((state) => state.view)
	const setView = usePlayerStore((state) => state.setView)
	const controlsHidden = usePlayerStore((state) => state.controlsHidden)
	const toggleControlsHidden = usePlayerStore((state) => state.toggleControlsHidden)

	// Local state (not persisted)
	const [defaultAudioDir, setDefaultAudioDir] = useState<string>('')
	const [directories, setDirectories] = useState<Directory[]>([])
	const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])

	// Refs for Lenis smooth scrolling
	const listWrapperRef = useRef<HTMLDivElement | null>(null)
	const listContentRef = useRef<HTMLDivElement | null>(null)
	const lenisRef = useRef<Lenis | null>(null)
	const controlsWrapperRef = useRef<HTMLDivElement>(null)

	// Ref for the current blob URL (to revoke it when switching tracks)
	const currentBlobUrlRef = useRef<string | null>(null)

	// Load audio files from a directory
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

	// Open a directory
	const handleOpenDirectory = useCallback(
		async (directoryPath: string) => {
			try {
				await loadAudioFiles(directoryPath)
				setSelectedFolder(directoryPath)
			} catch (error) {
				toast.error('Open directory error', { description: error as string })
			}
		},
		[loadAudioFiles, setSelectedFolder],
	)

	// Navigate to parent directory
	const handleParentDirectory = useCallback(() => {
		try {
			const parentPath = selectedFolder.split('\\').slice(0, -1).join('\\')

			if (parentPath) {
				void handleOpenDirectory(parentPath)
			}
		} catch (error) {
			toast.error('Parent directory error', { description: error as string })
		}
	}, [selectedFolder, handleOpenDirectory])

	// Play a track using Blob URL (avoids CORS issues with MediaElementAudioSourceNode)
	const playTrack = useCallback(
		async (track: AudioFile) => {
			const audio = audioRef.current
			if (!audio) return

			// Revoke previous blob URL to prevent memory leaks
			if (currentBlobUrlRef.current) {
				URL.revokeObjectURL(currentBlobUrlRef.current)
				currentBlobUrlRef.current = null
			}

			setCurrentTrack(track)

			try {
				// Read file as bytes and create a Blob URL
				// This avoids CORS issues with asset.localhost protocol
				const bytes = await readFile(track.path)

				// Detect MIME type from file extension
				const ext = track.path.split('.').pop()?.toLowerCase() || ''
				const mimeTypes: Record<string, string> = {
					mp3: 'audio/mpeg',
					wav: 'audio/wav',
					flac: 'audio/flac',
					aac: 'audio/aac',
					ogg: 'audio/ogg',
					m4a: 'audio/mp4',
					mp4: 'audio/mp4',
				}
				const mimeType = mimeTypes[ext] || 'audio/mpeg'

				const blob = new Blob([bytes], { type: mimeType })
				const blobUrl = URL.createObjectURL(blob)
				currentBlobUrlRef.current = blobUrl

				audio.src = blobUrl
				audio.volume = volume
				audio.muted = muted

				// Ensure audio graph is initialized and AudioContext is resumed
				await ensureAudioReady()

				await audio.play()
				setIsPlaying(true)
			} catch (error) {
				toast.error('Play track error', { description: String(error) })
				setIsPlaying(false)
			}
		},
		[setCurrentTrack, setIsPlaying, volume, muted, ensureAudioReady],
	)

	// Toggle play/pause
	const togglePlayPause = useCallback(async () => {
		const audio = audioRef.current
		if (!audio) return

		if (isPlaying) {
			audio.pause()
			setIsPlaying(false)
		} else {
			try {
				// Ensure audio graph is initialized and AudioContext is resumed
				await ensureAudioReady()
				await audio.play()
				setIsPlaying(true)
			} catch {
				setIsPlaying(false)
			}
		}
	}, [isPlaying, setIsPlaying, ensureAudioReady])

	// Stop playback
	const stopTrack = useCallback(() => {
		const audio = audioRef.current
		if (!audio) return

		audio.pause()
		audio.currentTime = 0
		setIsPlaying(false)
		setCurrentTime(0)
	}, [setIsPlaying, setCurrentTime])

	// Handle seek
	const handleSeek = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const audio = audioRef.current
			if (!audio) return

			const time = parseFloat(e.target.value)
			audio.currentTime = time
			setCurrentTime(time)
		},
		[setCurrentTime],
	)

	// Handle volume change
	const handleVolumeChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newVolume = parseFloat(e.target.value)
			setVolume(newVolume)
		},
		[setVolume],
	)

	// Handle mute toggle
	const handleMuteToggle = useCallback(() => {
		const audio = audioRef.current
		if (!audio) return

		toggleMuted()
		audio.muted = !muted
	}, [toggleMuted, muted])

	// Go to next track
	const nextTrack = useCallback(() => {
		if (currentTrack && audioFiles.length > 0) {
			const currentIndex = audioFiles.findIndex((file) => file.path === currentTrack.path)
			const nextIndex = (currentIndex + 1) % audioFiles.length
			void playTrack(audioFiles[nextIndex])
		}
	}, [currentTrack, audioFiles, playTrack])

	// Go to previous track
	const previousTrack = useCallback(() => {
		if (currentTrack && audioFiles.length > 0) {
			const currentIndex = audioFiles.findIndex((file) => file.path === currentTrack.path)
			const prevIndex = currentIndex === 0 ? audioFiles.length - 1 : currentIndex - 1
			void playTrack(audioFiles[prevIndex])
		}
	}, [currentTrack, audioFiles, playTrack])

	// Format time display (MM:SS)
	const formatTime = useCallback((time: number) => {
		const minutes = Math.floor(time / 60)
		const seconds = Math.floor(time % 60)
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}, [])

	// Audio event listeners
	useEffect(() => {
		const audio = audioRef.current
		if (!audio) return

		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime)
		}

		const handleLoadedMetadata = () => {
			setDuration(audio.duration)
		}

		const handleEnded = () => {
			if (repeatMode === 'one') {
				audio.currentTime = 0
				void audio.play()
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
	}, [repeatMode, nextTrack, setCurrentTime, setDuration, setIsPlaying])

	// biome-ignore lint/correctness/useExhaustiveDependencies: selectedFolder/audioFiles.length are intentional - re-create Lenis when they change
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
	}, [selectedFolder, audioFiles.length, setScrollPercentage])

	// biome-ignore lint/correctness/useExhaustiveDependencies: setDefaultAudioDir is stable from store
	useEffect(() => {
		audioDir().then((response) => {
			setDefaultAudioDir(response)
			// Use lastOpenedFolder if available, otherwise use default
			const folderToOpen = lastOpenedFolder || response
			void handleOpenDirectory(folderToOpen)
		})
	}, [lastOpenedFolder, handleOpenDirectory, setDefaultAudioDir])

	// GSAP animation for controls height
	useGSAP(
		() => {
			if (!controlsWrapperRef.current) return
			gsap.to(controlsWrapperRef.current, {
				height: controlsHidden ? '4.5rem' : 'auto',
				duration: 0.7,
				ease: 'expo.inOut',
				overwrite: true,
			})
		},
		{ dependencies: [controlsHidden, currentTrack], scope: controlsWrapperRef },
	)

	// Cleanup: revoke blob URL when unmounting
	useEffect(() => {
		return () => {
			if (currentBlobUrlRef.current) {
				URL.revokeObjectURL(currentBlobUrlRef.current)
				currentBlobUrlRef.current = null
			}
		}
	}, [])

	return (
		<div className="flex flex-col h-full overflow-hidden">
			<PlayerHeader selectedFolder={selectedFolder} view={view} setView={setView} scrollPercentage={scrollPercentage} />

			{/* File List */}
			<div ref={listWrapperRef} className="relative flex-1 min-h-0 p-4 overflow-hidden">
				<div
					ref={listContentRef}
					className={cn({
						'flex flex-col gap-1': view === 'list',
						'grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-1':
							view === 'grid',
					})}
				>
					{selectedFolder !== defaultAudioDir && (
						<Button variant="secondary" size="lg" className="flex justify-start" onClick={handleParentDirectory}>
							<span>
								<FolderOpen className="size-4" />
							</span>
							<span>...</span>
						</Button>
					)}
					{directories?.map((directory) => (
						<Button
							key={directory.path}
							variant="secondary"
							size="lg"
							className="flex justify-start"
							onClick={() => handleOpenDirectory(directory.path)}
						>
							<span>
								<FolderOpen className="size-4" />
							</span>
							<span>{directory.name}</span>
						</Button>
					))}
					{audioFiles?.map((file, index) => (
						<Button
							key={file.path}
							variant={currentTrack?.path === file.path ? 'default' : 'outline'}
							size="lg"
							className="flex justify-start"
							onClick={() => {
								currentTrack?.path !== file.path && void playTrack(file)
							}}
						>
							<span
								className={cn('w-4 flex items-center justify-center font-mono', {
									'opacity-30': currentTrack?.path !== file.path,
								})}
							>
								{`${index + 1}`.padStart(2, '0')}
							</span>
							<span className="truncate flex-1 text-left">{file.name.replace(/\.[^/.]+$/, '')}</span>
							{currentTrack?.path === file.path && isPlaying && (
								<div className="relative">
									<div className="w-2 h-2 bg-primary-foreground rounded-full animate-ping " />
									<div className="absolute inset-0 w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
								</div>
							)}
						</Button>
					))}
				</div>
			</div>

			{/* Controls */}
			{currentTrack && (
				<div ref={controlsWrapperRef} className="shrink-0 overflow-hidden">
					<PlayerControls
						audioRef={audioRef}
						currentTrack={currentTrack}
						isPlaying={isPlaying}
						currentTime={currentTime}
						duration={duration}
						volume={volume}
						muted={muted}
						repeatMode={repeatMode}
						controlsHidden={controlsHidden}
						formatTime={formatTime}
						previousTrack={previousTrack}
						togglePlayPause={togglePlayPause}
						stopTrack={stopTrack}
						nextTrack={nextTrack}
						handleSeek={handleSeek}
						handleVolumeChange={handleVolumeChange}
						handleMuteToggle={handleMuteToggle}
						toggleControlsHidden={toggleControlsHidden}
						cycleRepeatMode={cycleRepeatMode}
					/>
				</div>
			)}

			{/* Equalizer Modal */}
			<EqModal />

			{/* Hidden Audio Element */}
			<audio ref={audioRef}>
				<track kind="captions" />
			</audio>
		</div>
	)
}
