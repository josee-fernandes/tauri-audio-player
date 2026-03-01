export interface Directory {
	name: string
	path: string
	isDirectory: boolean
	isFile: boolean
	isSymlink: boolean
}

export interface AudioFile {
	name: string
	path: string
}
