import type { ApiGetDirectoryReturn, FileStateFile } from '@/store/files/types'
import { hiddenDirectories } from '@/store/variables'

/** Expand folders only when downloading them, preserving nested files without eager traversal. */
export async function collectArchiveItems(
    basePath: string,
    selected: Pick<FileStateFile, 'filename' | 'isDirectory'>[],
    request: (path: string) => Promise<ApiGetDirectoryReturn>
): Promise<string[]> {
    const items: string[] = []
    const base = basePath.replace(/^\/+|\/+$/g, '')
    for (const file of selected) {
        const path = `${base}/${file.filename}`
        if (!file.isDirectory) {
            items.push(path)
            continue
        }
        const result = await request(path)
        const children = [
            ...result.files.map((child) => ({ filename: child.filename, isDirectory: false })),
            ...result.dirs
                .filter((child) => !hiddenDirectories.includes(child.dirname))
                .map((child) => ({ filename: child.dirname, isDirectory: true })),
        ]
        items.push(...(await collectArchiveItems(path, children, request)))
    }
    return items
}
