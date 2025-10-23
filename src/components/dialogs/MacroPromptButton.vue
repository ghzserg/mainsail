<template>
    <v-btn :color="color" :style="computedStyle" class="mx-2" @click="sendCommand">{{ text }}</v-btn>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { ServerStateEventPrompt } from '@/store/server/types'

@Component({})
export default class MacroPromptButton extends Mixins(BaseMixin) {
    @Prop({ type: Object, required: true }) readonly event!: ServerStateEventPrompt

    get splits() {
        return this.event.message.split('|')
    }

    get text() {
        return this.splits[0]
    }

    get command() {
        return this.splits[1] ?? this.text
    }

    get color() {
        return this.splits[2] ?? ''
    }
    // https://github.com/function3d/mainsail/
    get bgcolor() {
        return this.splits[3] ? '#' + this.splits[3] : ''
    }

    get computedStyle() {
        let styles = ''
        if (this.bgcolor) {
            styles += `background-color: ${this.bgcolor} !important; `
        }
        if (this.textcolor) {
            styles += `color: ${this.textcolor} !important; `
        }
        return styles
    }

    get textcolor() {
        if (this.bgcolor) {
            var hex = this.hexToRgb(this.bgcolor)
            var gray = hex.r * 0.299 + hex.g * 0.587 + hex.b * 0.114
            if (gray > 186) return 'black'
            else return 'white'
        } else {
            return ''
        }
    }

    hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b
        })

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : null
    }
    // end https://github.com/function3d/mainsail/
    sendCommand() {
        this.$store.dispatch('server/addEvent', { message: this.command, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script: this.command })
    }
}
</script>
