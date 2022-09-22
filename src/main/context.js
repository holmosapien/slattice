import _ from 'lodash'

export default {
    window: undefined,
    model: undefined,

    setWindow: function(window) {
        this.window = window
    },

    setModel: function(model) {
        this.model = model
    },

    logger: function(...args) {
        if (_.isUndefined(this.window)) {
            console.log(...args)
        } else {
            this.window.webContents.send('log', ...args)
        }
    }
}