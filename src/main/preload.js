const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        rtmConnect(token) {
            ipcRenderer.send('rtmConnect', token);
        },
        requestTest(teamId, testType) {
            console.log("[requestTest] sending test ", testType, " for team ", teamId, " to main process")

            ipcRenderer.send('test', teamId, testType)
        },
        on(channel, func) {
            const validChannels = ['log', 'rtmConnect', 'slackAuthenticated', 'teamUpdate'];

            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender`
                ipcRenderer.on(channel, (event, ...args) => func(...args))
            }
        },
        once(channel, func) {
            const validChannels = ['log', 'rtmConnect', 'slackAuthenticated', 'teamUpdate'];

            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender`
                ipcRenderer.once(channel, (event, ...args) => func(...args))
            }
        }
    }
})