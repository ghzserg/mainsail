import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeferredDirectoryQueue } from '@/plugins/deferredDirectoryQueue'

const deferred = <T>() => {
    let resolve!: (value: T) => void
    let reject!: (error: Error) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

describe('deferred directory queue', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('does not send any filesystem work until the core UI is ready', async () => {
        const request = vi.fn().mockResolvedValue({})
        const queue = new DeferredDirectoryQueue(request, vi.fn(), vi.fn())
        queue.enqueue('config')
        await vi.runAllTimersAsync()
        expect(request).not.toHaveBeenCalled()
        queue.setEnabled(true)
        expect(request).not.toHaveBeenCalled()
        await vi.runAllTimersAsync()
        expect(request).toHaveBeenCalledExactlyOnceWith('config')
    })

    it('deduplicates pending and active directories and serializes requests', async () => {
        const first = deferred<object>()
        const request = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({})
        const apply = vi.fn()
        const queue = new DeferredDirectoryQueue(request, apply, vi.fn())
        queue.setEnabled(true)
        queue.enqueue('config')
        queue.enqueue('config')
        queue.enqueue('gcodes')
        await vi.advanceTimersByTimeAsync(0)
        queue.enqueue('config')
        expect(request).toHaveBeenCalledTimes(1)
        first.resolve({ files: [] })
        await vi.runAllTimersAsync()
        expect(request.mock.calls).toEqual([['config'], ['gcodes']])
        expect(apply).toHaveBeenCalledTimes(2)
    })

    it('can enqueue child directories from the current response', async () => {
        const request = vi.fn().mockResolvedValue({})
        const queue = new DeferredDirectoryQueue(
            request,
            (path) => {
                if (path === 'gcodes') queue.enqueue('gcodes/models')
            },
            vi.fn()
        )
        queue.enqueue('gcodes')
        queue.setEnabled(true)
        await vi.runAllTimersAsync()
        expect(request.mock.calls).toEqual([['gcodes'], ['gcodes/models']])
    })

    it('ignores an old connection response and cancels all pending work', async () => {
        const first = deferred<object>()
        const apply = vi.fn()
        const request = vi.fn().mockReturnValue(first.promise)
        const queue = new DeferredDirectoryQueue(request, apply, vi.fn())
        queue.setEnabled(true)
        queue.enqueue('config')
        queue.enqueue('docs')
        await vi.advanceTimersByTimeAsync(0)
        queue.cancel()
        first.resolve({})
        await vi.runAllTimersAsync()
        expect(apply).not.toHaveBeenCalled()
        expect(request).toHaveBeenCalledTimes(1)
        queue.enqueue('new')
        queue.setEnabled(true)
        await vi.runAllTimersAsync()
        expect(request).toHaveBeenCalledTimes(1)
    })

    it('continues after an RPC error without hiding or blocking the UI', async () => {
        const error = new Error('Permission denied')
        const request = vi.fn().mockRejectedValueOnce(error).mockResolvedValue({})
        const onError = vi.fn()
        const queue = new DeferredDirectoryQueue(request, vi.fn(), onError)
        queue.enqueue('config/private')
        queue.enqueue('gcodes')
        queue.setEnabled(true)
        await vi.runAllTimersAsync()
        expect(onError).toHaveBeenCalledWith('config/private', error)
        expect(request).toHaveBeenCalledTimes(2)
    })

    it('pauses further work during reconnect and isolates independent printers', async () => {
        const first = deferred<object>()
        const requestA = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue({})
        const requestB = vi.fn().mockResolvedValue({})
        const a = new DeferredDirectoryQueue(requestA, vi.fn(), vi.fn())
        const b = new DeferredDirectoryQueue(requestB, vi.fn(), vi.fn())
        a.enqueue('config')
        a.enqueue('docs')
        a.setEnabled(true)
        await vi.advanceTimersByTimeAsync(0)
        a.setEnabled(false)
        first.resolve({})
        b.enqueue('config')
        b.setEnabled(true)
        await vi.runAllTimersAsync()
        expect(requestA).toHaveBeenCalledTimes(1)
        expect(requestB).toHaveBeenCalledTimes(1)
        a.setEnabled(true)
        await vi.runAllTimersAsync()
        expect(requestA).toHaveBeenCalledTimes(2)
    })
})
