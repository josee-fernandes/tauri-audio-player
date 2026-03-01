import { AudioPlayer } from '@/components/audio-player'

export const Home: React.FC = () => {
	return (
		<div className="h-full">
			<AudioPlayer />
		</div>
	)
}

Home.displayName = 'Home'
