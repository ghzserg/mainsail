import Vue from 'vue'
import Vuex, { Store } from 'vuex'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TheDirectoryLoadIndicator from '@/components/TheDirectoryLoadIndicator.vue'
import type { DirectoryQueueProgress } from '@/plugins/deferredDirectoryQueue'

Vue.use(Vuex)

describe('directory loading indicator', () => {
    let store: Store<{ files: { directoryProgress: DirectoryQueueProgress } }>
    let indicator: Vue & {
        loading: boolean
        visible: boolean
        percent: number
        showCompleted: boolean
        showError: boolean
    }
    beforeEach(() => {
        vi.useFakeTimers()
        store = new Vuex.Store({
            state: { files: { directoryProgress: { pending: 0, completed: 0, failed: 0 } } },
            mutations: {
                progress(state, progress: DirectoryQueueProgress) {
                    state.files.directoryProgress = progress
                },
            },
        })
        indicator = new TheDirectoryLoadIndicator({ store }) as unknown as typeof indicator
    })
    afterEach(() => {
        indicator.$destroy()
        vi.useRealTimers()
    })

    it('shows actual progress, then a check for exactly ten seconds', async () => {
        expect(indicator.visible).toBe(false)
        store.commit('progress', { pending: 3, completed: 1, failed: 0 })
        await Vue.nextTick()
        expect(indicator.loading).toBe(true)
        expect(indicator.percent).toBe(25)
        store.commit('progress', { pending: 0, completed: 4, failed: 0 })
        await Vue.nextTick()
        expect(indicator.showCompleted).toBe(true)
        await vi.advanceTimersByTimeAsync(9999)
        expect(indicator.visible).toBe(true)
        await vi.advanceTimersByTimeAsync(1)
        expect(indicator.visible).toBe(false)
    })

    it('replaces the check with new work and starts a fresh completion timer', async () => {
        store.commit('progress', { pending: 0, completed: 4, failed: 0 })
        await Vue.nextTick()
        await vi.advanceTimersByTimeAsync(5000)
        store.commit('progress', { pending: 1, completed: 0, failed: 0 })
        await Vue.nextTick()
        expect(indicator.showCompleted).toBe(false)
        expect(vi.getTimerCount()).toBe(0)
        store.commit('progress', { pending: 0, completed: 1, failed: 0 })
        await Vue.nextTick()
        await vi.advanceTimersByTimeAsync(5000)
        expect(indicator.showCompleted).toBe(true)
    })

    it('does not show a success check for failed or cancelled work', async () => {
        store.commit('progress', { pending: 0, completed: 2, failed: 1 })
        await Vue.nextTick()
        expect(indicator.showCompleted).toBe(false)
        expect(indicator.showError).toBe(true)
        store.commit('progress', { pending: 0, completed: 0, failed: 0 })
        await Vue.nextTick()
        expect(indicator.visible).toBe(false)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('cleans up the completion timer when disconnected or destroyed', async () => {
        store.commit('progress', { pending: 0, completed: 2, failed: 0 })
        await Vue.nextTick()
        expect(vi.getTimerCount()).toBe(1)
        indicator.$destroy()
        expect(vi.getTimerCount()).toBe(0)
    })
})
