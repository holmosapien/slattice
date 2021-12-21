const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        rtmConnect(token) {
            ipcRenderer.send('rtmConnect', token);
        },
        refreshConversation(teamId, conversationId) {
            console.log(`[refreshConversation] sending request to refresh conversation ${conversationId} in team ${teamId} to main process`)

            ipcRenderer.send('refreshConversation', teamId, conversationId)
        },
        requestTest(teamId, testType) {
            console.log(`[requestTest] sending test ${testType} for team ${teamId} to main process`)

            ipcRenderer.send('test', teamId, testType)
        },
        deleteTeam(teamId) {
            console.log(`[deleteTeam] sending request to delete team ${teamId} to main process`)

            ipcRenderer.send('deleteTeam', teamId)
        },
        on(channel, func) {
            const validChannels = ['log', 'rtmConnect', 'slackAuthenticated', 'teamUpdate', 'deleteTeam'];

            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender`
                ipcRenderer.on(channel, (event, ...args) => func(...args))
            }
        },
        once(channel, func) {
            const validChannels = ['log', 'rtmConnect', 'slackAuthenticated', 'teamUpdate', 'deleteTeam'];

            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender`
                ipcRenderer.once(channel, (event, ...args) => func(...args))
            }
        }
    }
})