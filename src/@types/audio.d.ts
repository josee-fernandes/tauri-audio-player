interface Directory {
	name: string
	path: string
	isDirectory: boolean
	isFile: boolean
	isSymlink: boolean
}

interface AudioFile {
	name: string
	path: string
}
