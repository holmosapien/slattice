// const { RTMClient } = require('@slack/rtm-api')

export const ADD_TEAM            = 'ADD_TEAM'
export const REQUEST_CONNECTION  = 'REQUEST_CONNECTION'
export const TOKEN_AUTHENTICATED = 'TOKEN_AUTHENTICATED'
export const TEAM_UPDATE         = 'TEAM_UPDATE'

export function addTeam(token) {
    return {
        type: ADD_TEAM,
        token
    }
}

export function requestTokenConnection(token) {
    console.log(`Connecting with token ${token} ...`)

    return (dispatch) => {
        window.electron.ipcRenderer.rtmConnect(token)

        dispatch(handleTokenConnection(token))
    }
}

function handleTokenConnection(token) {
    return {
        type: REQUEST_CONNECTION,
        token
    }
}

export function handleAuthenticated(token, event) {
    return {
        type: TOKEN_AUTHENTICATED,
        token,
        event
    }
}

export function handleTeamUpdate(teamId, name, unread, typing) {
    return {
        type: TEAM_UPDATE,
        teamId,
        name,
        unread,
        typing
    }
}