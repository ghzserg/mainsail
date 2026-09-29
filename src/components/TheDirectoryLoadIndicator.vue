<template>
    <v-fade-transition>
        <div
            v-if="visible"
            class="directory-load-indicator d-flex align-center justify-center"
            role="status"
            aria-live="polite"
            :aria-label="statusLabel"
            :title="statusLabel">
            <v-progress-circular
                v-if="loading"
                :size="18"
                :width="2"
                :value="percent"
                :indeterminate="progress.completed === 0"
                color="primary" />
            <v-icon v-else-if="showCompleted" :size="18" color="success">{{ mdiCheckCircleOutline }}</v-icon>
            <v-icon v-else :size="18" color="warning">{{ mdiAlertCircleOutline }}</v-icon>
        </div>
    </v-fade-transition>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Watch } from 'vue-property-decorator'
import { mdiAlertCircleOutline, mdiCheckCircleOutline } from '@mdi/js'
import type { DirectoryQueueProgress } from '@/plugins/deferredDirectoryQueue'

@Component
export default class TheDirectoryLoadIndicator extends Vue {
    mdiAlertCircleOutline = mdiAlertCircleOutline
    mdiCheckCircleOutline = mdiCheckCircleOutline
    showCompleted = false
    showError = false
    completionTimer: ReturnType<typeof setTimeout> | null = null

    get progress(): DirectoryQueueProgress {
        return this.$store.state.files.directoryProgress
    }

    get loading(): boolean {
        return this.progress.pending > 0
    }

    get visible(): boolean {
        return this.loading || this.showCompleted || this.showError
    }

    get percent(): number {
        const total = this.progress.completed + this.progress.pending
        return total ? (this.progress.completed / total) * 100 : 0
    }

    get statusLabel(): string {
        if (this.loading) return this.$t('Files.BackgroundLoading').toString()
        return this.$t(this.showCompleted ? 'Files.BackgroundLoaded' : 'Files.BackgroundLoadFailed').toString()
    }

    @Watch('progress', { immediate: true })
    progressChanged(progress: DirectoryQueueProgress): void {
        this.clearCompletionTimer()
        this.showCompleted = false
        this.showError = false
        if (progress.pending || !progress.completed) return

        this.showCompleted = progress.failed === 0
        this.showError = progress.failed > 0
        this.completionTimer = setTimeout(() => {
            this.showCompleted = false
            this.showError = false
            this.completionTimer = null
        }, 10000)
    }

    beforeDestroy(): void {
        this.clearCompletionTimer()
    }

    clearCompletionTimer(): void {
        if (this.completionTimer !== null) clearTimeout(this.completionTimer)
        this.completionTimer = null
    }
}
</script>

<style scoped>
.directory-load-indicator {
    position: fixed;
    right: calc(16px + env(safe-area-inset-right, 0px));
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 5;
    width: 18px;
    height: 18px;
    pointer-events: none;
}
</style>
