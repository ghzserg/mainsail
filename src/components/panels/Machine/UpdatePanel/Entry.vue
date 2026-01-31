<template>
    <div>
        <v-row class="py-2">
            <v-col class="py-0">
                <strong>{{ name }}</strong>
            </v-col>
            <v-col v-if="configuredType !== 'system'" class="col-auto py-0 text-right">
                <v-btn
                    v-if="['klipper', 'moonraker'].includes(repo.name)"
                    :disabled="btnDisabled"
                    class="minwidth-0 px-2 ml-3"
                    color="primary"
                    small
                    @click="clickUpdate">
                    <v-icon small>{{ btnIcon }}</v-icon>
                    <span class="d-none d-sm-block ml-1">{{ btnText }}</span>
                </v-btn>
                <v-menu v-else-if="['web', 'python'].includes(configuredType)" left offset-y :close-on-content-click="false">
                    <template #activator="{ on, attrs }">
                        <v-btn
                            :disabled="btnDisabled"
                            class="minwidth-0 px-2 ml-3"
                            :color="btnColor"
                            small
                            v-bind="attrs"
                            v-on="on">
                            <v-icon small>{{ btnIcon }}</v-icon>
                            <span class="d-none d-sm-block ml-1">{{ btnText }}</span>
                            <v-icon small>{{ mdiMenuDown }}</v-icon>
                        </v-btn>
                    </template>
                    <v-list dense>
                        <v-list-item @click="clickUpdate">
                            <v-icon small class="mr-2">{{ mdiUpdate }}</v-icon>
                            {{ $t('Machine.UpdatePanel.Update') }}
                        </v-list-item>
                        <v-list-item v-if="existsRecoveryUrl" @click="doRecovery(false)">
                            <v-icon small class="mr-2">{{ mdiReload }}</v-icon>
                            {{ $t('Machine.UpdatePanel.SoftRecovery') }}
                        </v-list-item>
                        <v-list-item v-if="existsRecoveryUrl" @click="doRecovery(true)">
                            <v-icon small class="mr-2">{{ mdiReload }}</v-icon>
                            {{ $t('Machine.UpdatePanel.HardRecovery') }}
                        </v-list-item>
                    </v-list>
                </v-menu>
                <v-menu v-else-if="configuredType === 'git_repo'" left offset-y :close-on-content-click="false">
                    <template #activator="{ on, attrs }">
                        <v-btn
                            :disabled="btnDisabled"
                            class="minwidth-0 px-2 ml-3"
                            :color="btnColor"
                            small
                            v-bind="attrs"
                            v-on="on">
                            <v-icon small>{{ btnIcon }}</v-icon>
                            <span class="d-none d-sm-block ml-1">{{ btnText }}</span>
                            <v-icon small>{{ mdiMenuDown }}</v-icon>
                        </v-btn>
                    </template>
                    <v-list dense>
                        <v-list-item @click="clickUpdate">
                            <v-icon small class="mr-2">{{ mdiUpdate }}</v-icon>
                            {{ $t('Machine.UpdatePanel.Update') }}
                        </v-list-item>
                        <v-list-item v-if="existsRecoveryUrl" @click="doRecovery(false)">
                            <v-icon small class="mr-2">{{ mdiReload }}</v-icon>
                            {{ $t('Machine.UpdatePanel.SoftRecovery') }}
                        </v-list-item>
                        <v-list-item v-if="existsRecoveryUrl" @click="doRecovery(true)">
                            <v-icon small class="mr-2">{{ mdiReload }}</v-icon>
                            {{ $t('Machine.UpdatePanel.HardRecovery') }}
                        </v-list-item>
                    </v-list>
                </v-menu>
            </v-col>
        </v-row>
        <v-row class="mt-0">
            <v-col class="py-0">
                <v-row v-if="configuredType === 'system'" dense>
                    <v-col class="col-auto py-0">
                        <v-icon small>{{ mdiUpdate }}</v-icon>
                    </v-col>
                    <v-col class="py-0">
                        <span>{{ versionOutput }}</span>
                    </v-col>
                </v-row>
                <v-row v-else-if="configuredType === 'web'" dense>
                    <v-col class="col-auto py-0">
                        <v-icon small>{{ mdiUpdate }}</v-icon>
                    </v-col>
                    <v-col class="py-0">
                        <a :href="webLinkRelease" target="_blank" class="text-decoration-none">
                            {{ versionOutput }}
                            <v-icon small>{{ toggleAnomalies ? mdiInformationOutline : mdiInformation }}</v-icon>
                        </a>
                    </v-col>
                </v-row>
                <v-row v-else-if="configuredType === 'python'" dense>
                    <v-col class="col-auto py-0">
                        <v-icon small>{{ mdiUpdate }}</v-icon>
                    </v-col>
                    <v-col class="py-0">
                        <a :href="pythonChangelog" target="_blank" class="text-decoration-none">
                            {{ versionOutput }}
                            <v-icon small>{{ toggleAnomalies ? mdiInformationOutline : mdiInformation }}</v-icon>
                        </a>
                    </v-col>
                </v-row>
                <v-row v-else-if="configuredType === 'git_repo'" dense>
                    <v-col class="col-auto py-0">
                        <v-icon small>{{ mdiUpdate }}</v-icon>
                    </v-col>
                    <v-col class="py-0">
                        <a :href="githubRepoUrl" target="_blank" class="text-decoration-none">
                            {{ versionOutput }}
                            <v-icon small>{{ toggleAnomalies ? mdiInformationOutline : mdiInformation }}</v-icon>
                        </a>
                    </v-col>
                </v-row>
                <update-hint
                    v-if="boolShowUpdateHint"
                    :name="name"
                    @do-update="doUpdate"
                    @close="closeShowUpdateHint" />
            </v-col>
        </v-row>
        <git-commits-list
            v-if="configuredType === 'git_repo' && commitsBehind.length"
            :commits="commitsBehind"
            :name="repo.name" />
        <v-row v-if="anomalies.length || warnings.length" class="mt-3">
            <v-col>
                <v-alert
                    dense
                    text
                    border="left"
                    :color="toggleAnomalies ? 'warning' : 'info'"
                    :icon="toggleAnomalies ? mdiCloseCircle : mdiInformation"
                    @click="toggleAnomalies = !toggleAnomalies">
                    <div v-for="(message, index) in anomalies" :key="'anomaly' + index" class="text-caption">
                        {{ message }}
                    </div>
                    <div v-for="(message, index) in warnings" :key="'warning' + index" class="text-caption">
                        {{ message }}
                    </div>
                </v-alert>
            </v-col>
        </v-row>
    </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { ServerUpdateManagerStateGitRepo } from '@/store/server/updateManager/types'
import {
    mdiCloseCircle,
    mdiCheck,
    mdiHelpCircleOutline,
    mdiInformation,
    mdiInformationOutline,
    mdiMenuDown,
    mdiProgressUpload,
    mdiReload,
    mdiUpdate,
} from '@mdi/js'
import semver from 'semver'
import GitCommitsList from '@/components/panels/Machine/UpdatePanel/GitCommitsList.vue'
import UpdateHint from '@/components/panels/Machine/UpdatePanel/UpdateHint.vue'
@Component({
    components: { GitCommitsList, UpdateHint },
})
export default class UpdatePanelEntry extends Mixins(BaseMixin) {
    mdiInformation = mdiInformation
    mdiMenuDown = mdiMenuDown
    mdiReload = mdiReload
    mdiCloseCircle = mdiCloseCircle
    mdiUpdate = mdiUpdate
    mdiInformationOutline = mdiInformationOutline

    boolShowCommitList = false
    boolShowUpdateHint = false

    toggleAnomalies = false

    @Prop({ required: true }) readonly repo!: ServerUpdateManagerStateGitRepo
    @Prop({ default: false }) readonly checked!: boolean

    get name() {
        const info_tags = this.repo.info_tags ?? []
        const description = info_tags.find((tag) => tag.startsWith('desc='))

        if (description && description.trim() !== 'desc=') return description.replace('desc=', '').trim()

        return this.repo.name ?? 'UNKNOWN'
    }

    get type() {
        return this.repo.configured_type
    }

    get localVersion() {
        const version = this.repo.version ?? '?'
        if (!semver.valid(version, { loose: true })) return null

        return version
    }

    get remoteVersion() {
        const version = this.repo.remote_version ?? '?'
        if (!semver.valid(version, { loose: true })) return null

        return version
    }

    get branch() {
        return this.repo.branch ?? 'master'
    }

    get remoteAlias() {
        return this.repo.remote_alias ?? 'origin'
    }

    get branchOutput() {
        if (this.remoteAlias !== 'origin') return `${this.remoteAlias}/${this.branch}`
        if (!['master', 'main'].includes(this.branch)) return this.branch

        return null
    }

    get commitsBehind() {
        return this.repo.commits_behind ?? []
    }

    get fullVersionString() {
        return this.repo.full_version_string ?? null
    }

    get versionOutput() {
        let output = this.branchOutput ? `${this.branchOutput}: ` : ''

        if (this.semverUpdatable) {
            return `${output}${this.localVersion} > ${this.remoteVersion}`
        }

        if (this.commitsBehind.length) {
            const tmp = this.$tc('Machine.UpdatePanel.CommitsAvailable', this.commitsBehind.length, {
                count: this.commitsBehind.length,
            }).toString()

            if (this.localVersion) return `${output}${this.localVersion} > ${tmp}`

            return `${output}${tmp}`
        }

        if (this.fullVersionString) return this.fullVersionString
        if (this.localVersion) return this.localVersion

        return 'UNKNOWN'
    }

    get configuredType() {
        return this.repo.configured_type ?? 'git_repo'
    }

    get isValid() {
        return this.repo.is_valid ?? true
    }

    get isDirty() {
        return this.repo.is_dirty ?? false
    }

    get isCorrupt() {
        if (this.configuredType !== 'git_repo') return false

        return this.repo.corrupt ?? false
    }

    get debugEnabled() {
        return this.repo.debug_enabled ?? false
    }

    get isDetached() {
        if (this.configuredType !== 'git_repo') return false

        return !this.debugEnabled && (this.repo.detached ?? false)
    }

    get existsRecoveryUrl() {
        const url = this.repo.recovery_url ?? '?'

        return url !== '?'
    }

    get btnDisabled() {
        if (!this.checked) return true
        if (['printing', 'paused'].includes(this.printer_state)) return true
        if (!this.isValid || this.isCorrupt || this.isDirty || this.commitsBehind.length) return false

        if (['python', 'web'].includes(this.type)) return !this.semverUpdatable

        return this.commitsBehind.length === 0
    }

    get btnIcon() {
        if (this.isDetached || !this.isValid || this.isCorrupt || this.isDirty) return mdiCloseCircle

        if (['python', 'web'].includes(this.type)) {
            if (this.semverUpdatable) return mdiProgressUpload
            else if (this.localVersion === null || this.remoteVersion === null) return mdiHelpCircleOutline
        }

        if (this.type === 'git_repo' && this.commitsBehind.length) return mdiProgressUpload

        return mdiCheck
    }

    get btnColor() {
        if (this.isCorrupt || this.isDetached || this.isDirty || !this.isValid) return 'orange'

        if (['python', 'web'].includes(this.type) && this.semverUpdatable) return 'primary'
        if (this.type === 'git_repo' && this.commitsBehind.length) return 'primary'

        return 'green'
    }

    get btnText() {
        if (this.isCorrupt) return this.$t('Machine.UpdatePanel.Corrupt')
        if (this.isDetached) return this.$t('Machine.UpdatePanel.Detached')
        if (this.isDirty) return this.$t('Machine.UpdatePanel.Dirty')
        if (!this.isValid) return this.$t('Machine.UpdatePanel.Invalid')

        if (['python', 'web'].includes(this.type)) {
            if (this.semverUpdatable) return this.$t('Machine.UpdatePanel.Update')
            else if (this.localVersion === null || this.remoteVersion === null)
                return this.$t('Machine.UpdatePanel.Unknown')
        }

        if (this.type === 'git_repo' && this.commitsBehind.length) return this.$t('Machine.UpdatePanel.Update')

        return this.$t('Machine.UpdatePanel.UpToDate')
    }

    get anomalies() {
        return this.repo.anomalies ?? []
    }

    get warnings() {
        return this.repo.warnings ?? []
    }

    get semverUpdatable() {
        if (!this.localVersion) return false
        if (!this.remoteVersion) return false

        return semver.gt(this.remoteVersion, this.localVersion, { loose: true })
    }

    get repo_name() {
        return this.repo.repo_name ?? this.repo.name ?? ''
    }

    get githubRepoUrl() {
        return `https://github.com/${this.repo.owner}/${this.repo_name}`
    }

    get webLinkRelease() {
        return `${this.githubRepoUrl}/releases/tag/${this.repo.remote_version}`
    }

    get pythonChangelog() {
        if (this.repo.channel === 'dev')
            return `${this.githubRepoUrl}/compare/${this.repo.current_hash}..${this.repo.remote_hash}`

        if (this.repo.changelog_url) return this.repo.changelog_url

        return this.webLinkRelease
    }

    get hideUpdateWarning() {
        return this.$store.state.gui.uiSettings.hideUpdateWarnings ?? false
    }

    clickUpdate() {
        if (this.hideUpdateWarning) {
            this.doUpdate()
            return
        }

        this.boolShowUpdateHint = true
    }

    doUpdate() {
        if (['klipper', 'moonraker'].includes(this.repo.name)) {
            this.$socket.emit('machine.update.' + this.repo.name, {})
            return
        }

        this.$socket.emit('machine.update.client', { name: this.repo.name })
    }

    doRecovery(hard: boolean) {
        this.$socket.emit('machine.update.recover', { name: this.repo.name, hard: hard })
    }

    closeCommitList() {
        this.boolShowCommitList = false
    }

    closeShowUpdateHint() {
        this.boolShowUpdateHint = false
    }
}
</script>
