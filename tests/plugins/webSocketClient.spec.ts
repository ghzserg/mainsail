import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketClient } from '@/plugins/webSocketClient'
import type { Store } from 'vuex'
import type { RootState } from '@/store/types'

class FakeSocket {
    static OPEN = 1
    readyState = 1
    onopen: (() => void) | null = null
    onclose: ((event: { wasClean: boolean }) => void) | null = null
    onerror: (() => void) | null = null
    onmessage: ((event: { data: string }) => void) | null = null
    send = vi.fn()
    close = vi.fn()
}

describe('socket lifecycle for deferred requests', () => {
    const dispatch = vi.fn()
    let client: WebSocketClient
    beforeEach(() => {
        vi.useFakeTimers()
        vi.stubGlobal('WebSocket', FakeSocket)
        vi.stubGlobal('window', { console, setTimeout })
        dispatch.mockReset()
        client = new WebSocketClient({ url: 'ws://test/websocket', store: { dispatch } as unknown as Store<RootState> })
    })
    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('removes the first pending RPC and ignores unknown IDs', async () => {
        await client.connect()
        const pending = client.emitAndWait('printer.objects.list')
        client.removeWaitById(999)
        expect(client.waits).toHaveLength(1)
        client.handleMessage({ id: 0, result: { objects: [] } })
        await expect(pending).resolves.toEqual({ objects: [] })
        expect(client.waits).toEqual([])
    })

    it('rejects and releases pending work on an unclean disconnect before reconnect', async () => {
        await client.connect()
        const pending = client.emitAndWait('server.files.get_directory', { path: 'config' })
        const rejected = expect(pending).rejects.toThrow('WebSocket disconnected')
        ;(client.instance as unknown as FakeSocket).onclose?.({ wasClean: false })
        await rejected
        expect(client.waits).toEqual([])
        expect(dispatch).toHaveBeenCalledWith('socket/onClose', { wasClean: false })
    })

    it('does not allocate or send RPCs when the socket is closed', async () => {
        await expect(client.emitAndWait('printer.objects.list')).rejects.toThrow('not connected')
        expect(client.waits).toEqual([])
        expect(client.messageId).toBe(0)
    })

    it('ignores messages and delayed reconnects from a replaced printer socket', async () => {
        await client.connect()
        const old = client.instance as unknown as FakeSocket
        old.onclose?.({ wasClean: false })
        await client.connect()
        const replacement = client.instance
        dispatch.mockClear()
        old.onmessage?.({
            data: JSON.stringify({ method: 'notify_status_update', params: [{ 'gcode_macro OLD': { stale: true } }] }),
        })
        await vi.runAllTimersAsync()
        expect(client.instance).toBe(replacement)
        expect(dispatch).not.toHaveBeenCalled()
    })
})
