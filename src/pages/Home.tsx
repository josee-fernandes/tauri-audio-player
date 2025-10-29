import { AudioPlayer } from '@/components/AudioPlayer'

export const Home: React.FC = () => {
	return (
		<div className="h-full">
			<AudioPlayer />
		</div>
	)
}

Home.displayName = 'Home'
