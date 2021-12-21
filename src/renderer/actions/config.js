import _ from 'lodash'

export const REQUEST_CONFIG = 'REQUEST_CONFIG'
export const RECEIVE_CONFIG = 'RECEIVE_CONFIG'

export function loadConfig() {
    return (dispatch) => {
        dispatch(requestConfig())

        let config = {
            tokens: []
        }

        const tokensStr = window.localStorage.getItem('tokens')

        if (tokensStr) {
            const tokens = JSON.parse(tokensStr)

            config.tokens = tokens
        }

        dispatch(receiveConfig(config))
    }
}

export function requestConfig() {
    return {
        type: REQUEST_CONFIG
    }
}

export function receiveConfig(config) {
    return {
        type: RECEIVE_CONFIG,
        config
    }
}

export function saveConfig(config) {
    return (dispatch) => {
        const tokensStr = JSON.stringify(config.tokens)

        window.localStorage.setItem('tokens', tokensStr)

        dispatch(receiveConfig(config))
    }
}