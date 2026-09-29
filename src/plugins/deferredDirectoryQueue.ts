/** Keeps background traversal out of initialization and limits it to one RPC at a time. */
export class DeferredDirectoryQueue<T> {
    private paths = new Set<string>()
    private activePath: string | null = null
    private running = false
    private cancelled = false
    private enabled = false
    private timer: ReturnType<typeof setTimeout> | null = null

    constructor(
        private request: (path: string) => Promise<T>,
        private apply: (path: string, result: T) => void,
        private onError: (path: string, error: unknown) => void
    ) {}

    enqueue(path: string): void {
        if (this.cancelled || path === this.activePath) return
        this.paths.add(path)
        this.schedule()
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled
        this.schedule()
    }

    cancel(): void {
        this.cancelled = true
        this.paths.clear()
        if (this.timer !== null) clearTimeout(this.timer)
        this.timer = null
    }

    private schedule(): void {
        if (this.cancelled || !this.enabled || this.running || this.timer !== null || !this.paths.size) return
        // Let Vue render the ready UI before starting traversal, and yield between directories.
        this.timer = setTimeout(() => {
            this.timer = null
            void this.next()
        }, 0)
    }

    private async next(): Promise<void> {
        if (this.cancelled || !this.enabled) return
        const path = this.paths.values().next().value
        if (path === undefined) return
        this.paths.delete(path)
        this.activePath = path
        this.running = true
        try {
            const result = await this.request(path)
            if (!this.cancelled) this.apply(path, result)
        } catch (error) {
            if (!this.cancelled) this.onError(path, error)
        } finally {
            this.activePath = null
            this.running = false
            this.schedule()
        }
    }
}
