<template>
    <panel
        :title="$t('Machine.UpdatePanel.UpdateManager')"
        :icon="mdiUpdate"
        :loading="loading"
        :collapsible="true"
        card-class="update-manager-panel">
        <v-card-text v-if="!enableUpdateManager">
            <v-row>
                <v-col>
                    <p class="text-center mb-0">{{ $t('Machine.UpdatePanel.UpdateManagerDisabled') }}</p>
                </v-col>
            </v-row>
        </v-card-text>
        <v-card-text v-else>
            <v-row>
                <v-col class="text-right">
                    <v-btn
                        :loading="loadingBtnSyncUpdateManager"
                        :title="$t('Machine.UpdatePanel.CheckForUpdates')"
                        class="ml-2 minwidth-0 px-2"
                        color="primary"
                        @click="btnSync">
                        <v-icon small>{{ mdiRefresh }}</v-icon>
                        <span class="d-none d-sm-block ml-1">{{ $t('Machine.UpdatePanel.CheckForUpdates') }}</span>
                    </v-btn>
                </v-col>
            </v-row>
            <div class="update-manager-list">
                <update-panel-entry-system v-if="existsSystemModul" />
                <update-panel-entry
                    v-for="module in modules"
                    :key="module.key"
                    :repo="module.data"
                    :checked="checkedManually" />
            </div>
        </v-card-text>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
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

    checkedManually = false

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

    btnSync() {
        this.checkedManually = true
        this.$socket.emit(
            'machine.update.status',
            { refresh: true },
            { action: 'server/updateManager/onUpdateStatus', loading: 'loadingBtnSyncUpdateManager' }
        )
    }
}
</script>

<style scoped>
::v-deep .update-manager-list > div:last-child > div.row {
    padding-bottom: 0 !important;
}
</style>
