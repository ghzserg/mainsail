import { describe, expect, it, vi } from 'vitest'
import { collectArchiveItems } from '@/plugins/collectArchiveItems'

describe('archives with lazy directories', () => {
    it('includes unvisited nested files, omits hidden .git trees and queries folders sequentially', async () => {
        const request = vi.fn().mockImplementation(async (path: string) => ({
            files: [{ filename: path === 'config/mod' ? 'mod.cfg' : 'deep.cfg' }],
            dirs: path === 'config/mod' ? [{ dirname: 'nested' }, { dirname: '.git' }] : [],
        }))
        const items = await collectArchiveItems('/config', [{ filename: 'mod', isDirectory: true }], request)
        expect(items).toEqual(['config/mod/mod.cfg', 'config/mod/nested/deep.cfg'])
        expect(request.mock.calls).toEqual([['config/mod'], ['config/mod/nested']])
    })

    it('downloads selected files without directory RPCs', async () => {
        const request = vi.fn()
        expect(
            await collectArchiveItems('/config/', [{ filename: 'printer.cfg', isDirectory: false }], request)
        ).toEqual(['config/printer.cfg'])
        expect(request).not.toHaveBeenCalled()
    })

    it('reports an error instead of silently constructing an incomplete archive', async () => {
        const request = vi.fn().mockRejectedValue(new Error('Access denied'))
        await expect(
            collectArchiveItems('config', [{ filename: 'private', isDirectory: true }], request)
        ).rejects.toThrow('Access denied')
    })
})
