import type { ApiGetDirectoryReturn } from '@/store/files/types'

export interface FileManagerRPC {
    'server.files.get_directory': (params: { path: string; extended?: boolean }) => Promise<ApiGetDirectoryReturn>
}
