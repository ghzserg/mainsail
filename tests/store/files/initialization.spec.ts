import Vue from 'vue'
import Vuex, { Store } from 'vuex'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { files, getDefaultState } from '@/store/files'
import { printer } from '@/store/printer'
import type { RootState } from '@/store/types'
import type { FileState } from '@/store/files/types'

vi.mock('@/plugins/i18n', () => ({ default: { t: (text: string) => text } }))
Vue.use(Vuex)

describe('file initialization with real Vuex modules', () => {
    let store: Store<RootState & { files: FileState }>
    const result = { dirs: [], files: [], disk_usage: { free: 1, used: 1, total: 2 } }
    const emitAndWait = vi.fn()
    beforeEach(() => {
        vi.useFakeTimers()
        vi.stubGlobal('window', { console })
        emitAndWait.mockReset().mockResolvedValue(result)
        Vue.$socket = { instance: { readyState: 1 }, emitAndWait } as unknown as typeof Vue.$socket
        store = new Store<RootState & { files: FileState }>({
            modules: {
                files: { ...files, state: getDefaultState() },
                printer: { ...printer, state: {} },
                socket: {
                    namespaced: true,
                    state: { isConnected: true, initializationList: ['printer/initSubscripts'] },
                    mutations: {
                        ready(state) {
                            state.initializationList = []
                        },
                    },
                },
            },
        })
    })
    afterEach(async () => {
        await store.dispatch('files/cancelDirectoryRequests')
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('creates all roots but defers filesystem RPCs, and loads unused roots only on demand', async () => {
        await store.dispatch('files/initRootDirs', ['config', 'logs', 'gcodes', 'config_examples', 'docs'])
        expect(store.state.files?.filetree).toHaveLength(5)
        await vi.runAllTimersAsync()
        expect(emitAndWait).not.toHaveBeenCalled()
        store.commit('socket/ready')
        await Vue.nextTick()
        await vi.runAllTimersAsync()
        expect(emitAndWait.mock.calls.map((call) => call[1].path)).toEqual(['gcodes', 'config'])
        await store.dispatch('files/requestDirectoryPath', '/docs')
        await vi.runAllTimersAsync()
        expect(emitAndWait.mock.calls.at(-1)?.[1]).toEqual({ path: 'docs' })
        expect(store.getters['files/getDirectory']('docs').loaded).toBe(true)
    })

    it('does not recursively traverse config symlinks but retains theme and gcode discovery', async () => {
        emitAndWait.mockImplementation(async (_, { path }) => ({
            ...result,
            dirs:
                path === 'config'
                    ? ['mod', 'rw', '.theme'].map((dirname) => ({ dirname, modified: 1, size: 0, permissions: 'r' }))
                    : path === 'gcodes'
                      ? [{ dirname: 'models', modified: 1, size: 0, permissions: 'r' }]
                      : [],
        }))
        await store.dispatch('files/initRootDirs', ['config', 'gcodes'])
        store.commit('socket/ready')
        await Vue.nextTick()
        await vi.runAllTimersAsync()
        expect(emitAndWait.mock.calls.map((call) => call[1].path)).toEqual([
            'gcodes',
            'config',
            'gcodes/models',
            'config/.theme',
        ])
        expect(store.getters['files/getDirectory']('config/mod')).toBeTruthy()
        expect(store.getters['files/getDirectory']('config/mod').loaded).not.toBe(true)
    })

    it('loads missing ancestors before a saved nested browser path', async () => {
        emitAndWait.mockImplementation(async (_, { path }) => ({
            ...result,
            dirs: path === 'config' ? [{ dirname: 'mod', modified: 1, size: 0, permissions: 'r' }] : [],
            files: path === 'config/mod' ? [{ filename: 'mod.cfg', modified: 1, size: 20, permissions: 'r' }] : [],
        }))
        await store.dispatch('files/initRootDirs', ['config'])
        await store.dispatch('files/requestDirectoryPath', '/config/mod')
        store.commit('socket/ready')
        await Vue.nextTick()
        await vi.runAllTimersAsync()
        expect(emitAndWait.mock.calls.map((call) => call[1].path)).toEqual(['config', 'config/mod'])
        expect(store.getters['files/getFile']('config/mod/mod.cfg').size).toBe(20)
    })

    it('resets stale jobs on printer switching and starts a fresh queue on reconnect', async () => {
        let resolve!: (value: typeof result) => void
        emitAndWait.mockReturnValueOnce(
            new Promise((res) => {
                resolve = res
            })
        )
        await store.dispatch('files/initRootDirs', ['config', 'gcodes'])
        store.commit('socket/ready')
        await Vue.nextTick()
        await vi.advanceTimersByTimeAsync(0)
        await store.dispatch('files/reset')
        Vue.$socket.instance = { readyState: 1 } as WebSocket
        resolve({
            ...result,
            files: [{ filename: 'old.gcode', modified: 1, size: 9, permissions: 'r' }],
        } as typeof result)
        await vi.runAllTimersAsync()
        expect(store.state.files?.filetree).toEqual([])
        await store.dispatch('files/initRootDirs', ['config'])
        await vi.runAllTimersAsync()
        expect(emitAndWait.mock.calls.map((call) => call[1].path)).toEqual(['gcodes', 'config'])
    })

    it.each([0, 1, 250])(
        'preserves macro discovery and live variables with %i macros while file work is deferred',
        async (count) => {
            const macroState = Object.fromEntries(
                Array.from({ length: count }, (_, i) => [`gcode_macro TEST_${i}`, i < 50 ? { live: i } : {}])
            )
            const settings = Object.fromEntries(
                Array.from({ length: count }, (_, i) => [`gcode_macro test_${i}`, { gcode: 'G4 P0' }])
            )
            store.commit('printer/setData', { ...macroState, configfile: { settings }, gcode: { commands: {} } })
            await store.dispatch('files/initRootDirs', ['config', 'gcodes'])
            await vi.runAllTimersAsync()
            const macros = store.getters['printer/getMacros']
            expect(macros).toHaveLength(count)
            if (count)
                expect(macros.find((macro: { name: string }) => macro.name === 'TEST_0').variables).toEqual({ live: 0 })
            expect(emitAndWait).not.toHaveBeenCalled()
        }
    )
})
