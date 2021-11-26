import _ from 'lodash'

export default {
    window: undefined,

    setWindow: function(window) {
        this.window = window
    },

    logger: function(...args) {
        if (_.isUndefined(this.window)) {
            console.log(...args)
        } else {
            this.window.webContents.send('log', ...args)
        }
    }
}