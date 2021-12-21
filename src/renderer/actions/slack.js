import _ from 'lodash'

export const ADD_TEAM            = 'ADD_TEAM'
export const REQUEST_CONNECTION  = 'REQUEST_CONNECTION'
export const TOKEN_AUTHENTICATED = 'TOKEN_AUTHENTICATED'
export const TEAM_UPDATE         = 'TEAM_UPDATE'
export const CLEAN_TOKENS        = 'CLEAN_TOKENS'
export const DELETE_TEAM         = 'DELETE_TEAM'

export function addTeam(token) {
    return (dispatch) => {
        dispatch({
            type: ADD_TEAM,
            token
        })

        dispatch(requestTokenConnection(token))
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

export function handleTeamUpdate(teamId, name, token, unread, typing) {
    return {
        type: TEAM_UPDATE,
        teamId,
        name,
        token,
        unread,
        typing
    }
}

export function cleanTokens() {
    return {
        type: CLEAN_TOKENS
    }
}

export function deleteTeam(teamId) {
    return (dispatch, getState) => {
        window.electron.ipcRenderer.deleteTeam(teamId)

        /*
         * Find the token for this team ID.
         *
         */

        const state = getState()
        const team = state.slack.teams[teamId]
        const badToken = (_.isUndefined(team)) ? undefined : team.token

        /*
         * Remove the team from state. This will also trigger a config save in the Teams component.
         *
         */

        dispatch({
            type: DELETE_TEAM,
            teamId,
            token: badToken
        })
    }
}