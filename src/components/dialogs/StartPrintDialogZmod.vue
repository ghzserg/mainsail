<template>
    <v-card-text v-if="zmod" class="py-3 bt-1">
        <settings-row :title="$t('Dialogs.StartPrint.Afc.Leveling')" :dense="true">
            <v-switch :input-value="leveling" hide-details class="mt-0" @change="save('print_leveling', $event)" />
        </settings-row>
        <settings-row v-if="c5pro" :title="$t('Dialogs.StartPrint.Afc.AutoPa')" :dense="true">
            <v-switch :input-value="autoPa" hide-details class="mt-0" @change="save('print_autopa', $event)" />
        </settings-row>
    </v-card-text>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'

// Z-Mod: global print start flags in save_variables, as zmod_color writes them
@Component
export default class StartPrintDialogZmod extends Mixins(BaseMixin) {
    get zmod(): boolean {
        return this.$store.state.printer.zmod_color != null
    }

    get c5pro(): boolean {
        return this.$store.state.printer['gcode_macro _CLIENT_VARIABLE']?.c5pro === true
    }

    get leveling(): boolean {
        return Number(this.$store.state.printer.save_variables?.variables?.print_leveling) === 1
    }

    get autoPa(): boolean {
        return Number(this.$store.state.printer.save_variables?.variables?.print_autopa) === 1
    }

    save(name: string, value: boolean) {
        const script = `SAVE_VARIABLE VARIABLE=${name} VALUE=${value ? 1 : 0}`
        this.$store.dispatch('server/addEvent', { message: script, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script })
    }
}
</script>
