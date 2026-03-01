import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef } from 'react'
import { Logo } from './logo'

export function Preloader() {
	const logoRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	useGSAP(() => {
		const tl = gsap.timeline({ delay: 1 })

		tl.fromTo(
			logoRef.current,
			{
				opacity: 0,
			},
			{
				left: '50%',
				top: '50%',
				xPercent: -50,
				yPercent: -50,
				height: '12rem',
				opacity: 1,
				duration: 0.5,
			},
		)
			.fromTo(
				logoRef.current,
				{
					left: '50%',
					top: '50%',
					xPercent: -50,
					yPercent: -50,
					height: '12rem',
				},
				{
					left: '0.5rem',
					top: '1rem',
					xPercent: 0,
					yPercent: 0,
					height: '2rem',
					duration: 2,
					ease: 'power4.inOut',
				},
			)
			.to(containerRef.current, {
				opacity: 0,
				duration: 0.5,
				ease: 'power3.inOut',
				onComplete: () => {
					containerRef.current?.remove()
				},
			})
	})

	return (
		<div ref={containerRef} className="fixed top-0 left-0 w-full h-full bg-background z-9999">
			<div className="relative w-full h-full">
				<div ref={logoRef} className="absolute h-48">
					<Logo className="w-full h-full" />
				</div>
			</div>
		</div>
	)
}
