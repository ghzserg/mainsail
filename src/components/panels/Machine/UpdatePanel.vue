<template>
    <div>
        <panel
            :title="$t('Machine.UpdatePanel.UpdateManager')"
            :icon="mdiUpdate"
            card-class="machine-update-panel"
            :loading="loadingUpdateStatus"
        >
            <v-card-text>
                <v-row>
                    <v-col class="py-2">
                        <v-btn
                            v-if="!checkInitState"
                            outlined
                            small
                            color="primary"
                            :loading="loadingBtnSyncUpdateManager"
                            @click="btnSync"
                        >
                            <v-icon left>{{ mdiRefresh }}</v-icon>
                            {{ $t('Machine.UpdatePanel.InitUpdateManager') }}
                        </v-btn>
                        <v-btn
                            v-else
                            outlined
                            small
                            color="primary"
                            :loading="loadingBtnSyncUpdateManager"
                            @click="btnSync"
                        >
                            <v-icon left>{{ mdiRefresh }}</v-icon>
                            {{ $t('Machine.UpdatePanel.CheckForUpdates') }}
                        </v-btn>
                    </v-col>
                </v-row>
                <v-divider class="my-2" />
                <v-row v-if="!checkInitState" class="py-3">
                    <v-col>
                        <v-alert dense text type="info">
                            <span class="d-block">{{ $t('Machine.UpdatePanel.UpdateManagerNotReady') }}</span>
                            <a href="https://docs.mainsail.xyz/setup/update-manager" target="_blank">
                                {{ $t('Machine.UpdatePanel.Documentation') }}
                            </a>
                        </v-alert>
                    </v-col>
                </v-row>
                <v-row v-else class="update-manager-list">
                    <v-col class="py-2">
                        <update-panel-entry
                            v-for="module in modules"
                            :key="module.key"
                            :repo="module.data"
                            :disabled="updatesChecked !== true || loadingBtnSyncUpdateManager"
                        />
                        <update-panel-entry-system
                            v-if="existsSystemModul"
                            :disabled="updatesChecked !== true || loadingBtnSyncUpdateManager"
                        />
                    </v-col>
                </v-row>
            </v-card-text>
        </panel>
    </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import BaseMixin from '../../mixins/base'
import Panel from '@/components/ui/Panel.vue'
import UpdatePanelEntry from '@/components/panels/Machine/UpdatePanel/Entry.vue'
import UpdatePanelEntrySystem from '@/components/panels/Machine/UpdatePanel/EntrySystem.vue'
import { mdiRefresh, mdiInformation, mdiCloseThick, mdiUpdate } from '@mdi/js'
import { ServerUpdateManagerStateGuiList } from '@/store/server/updateManager/types'
import semver from 'semver'

@Component({
    components: { Panel, UpdatePanelEntry, UpdatePanelEntrySystem },
})
export default class UpdatePanel extends Mixins(BaseMixin) {
    mdiRefresh = mdiRefresh
    mdiInformation = mdiInformation
    mdiCloseThick = mdiCloseThick
    mdiUpdate = mdiUpdate

    updatesChecked: boolean | null = false

    get enableUpdateManager() {
        return this.$store.state.server.components.includes('update_manager')
    }

    get modules() {
        return this.$store.getters['server/updateManager/getUpdateManagerList'] ?? []
    }

    get existsSystemModul() {
        return 'system' in this.$store.state.server.updateManager
    }

    get systemPackagesCount() {
        return this.$store.state.server.updateManager?.system?.package_count ?? 0
    }

    get checkInitState() {
        const initModules = this.modules.filter(
            (module: ServerUpdateManagerStateGuiList) => module.data.remote_version !== '?'
        )

        return initModules.length > 0
    }

    get showUpdateAll() {
        let count = 0

        this.modules.forEach((module: ServerUpdateManagerStateGuiList) => {
            if (module.type === 'git' && module.data?.commits_behind?.length) {
                count++
                return
            }

            if (
                module.type === 'web' &&
                semver.valid(module.data?.remote_version, { loose: true }) &&
                semver.valid(module.data?.version, { loose: true }) &&
                semver.gt(module.data?.remote_version, module.data?.version, { loose: true })
            ) {
                count++
                return
            }
        })

        if (this.systemPackagesCount > 0) count++

        return count > 1
    }

    get loadingUpdateStatus() {
        return this.$store.state.server.updateManager?.status === 'loading'
    }

    get loadingBtnSyncUpdateManager() {
        return this.$store.state.socket.loading.includes('loadingBtnSyncUpdateManager')
    }

    @Watch('loadingBtnSyncUpdateManager')
    onLoadingChanged(val: boolean) {
        if (!val && this.updatesChecked === null) {
            this.updatesChecked = true
        }
    }

    btnSync() {
        this.$socket.emit(
            'machine.update.status',
            { refresh: true },
            { action: 'server/updateManager/onUpdateStatus', loading: 'loadingBtnSyncUpdateManager' }
        )
        this.updatesChecked = null
    }
}
</script>

<style scoped>
::v-deep .update-manager-list > div:last-child > div.row {
    padding-bottom: 0 !important;
}
</style>
