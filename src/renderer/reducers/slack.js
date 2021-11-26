import _ from 'lodash'
import update from 'immutability-helper'

import {
    REQUEST_CONFIG,
    RECEIVE_CONFIG
} from '../actions/config'

import {
    ADD_TEAM,
    REQUEST_CONNECTION,
    TOKEN_AUTHENTICATED,
    TEAM_UPDATE
} from '../actions/slack'

const defaultSlackState = {
    loadingConfig: false,
    tokens: {},
    teams: {}
}

export default function slack(state = defaultSlackState, action) {
    switch (action.type) {
        case REQUEST_CONFIG:
            return update(state, {
                loadingConfig: {
                    $set: true
                }
            })
        case RECEIVE_CONFIG:
            let newState = {
                loadingConfig: {
                    $set: false
                }
            }

            let newTokens = {}

            action.config.tokens.forEach((token) => {
                if (_.isUndefined(state.tokens[token])) {
                    newTokens[token] = {
                        $set: {
                            connected: false
                        }
                    }
                }
            })

            if (Object.keys(newTokens).length > 0) {
                newState.tokens = newTokens
            }

            return update(state, newState)
        case ADD_TEAM:
        {
            const token = action.token

            if (_.isUndefined(state.tokens[token])) {
                return update(state, {
                    tokens: {
                        [token]: {
                            $set: {
                                connected: false
                            }
                        }
                    }
                })
            }

            return state
        }
        case REQUEST_CONNECTION:
        {
            const token = action.token

            return update(state, {
                tokens: {
                    [token]: {
                        connected: {
                            $set: true
                        }
                    }
                }
            })
        }
        case TOKEN_AUTHENTICATED:
            return state
        case TEAM_UPDATE:
        {
            const { teamId, name, unread, typing } = action

            return update(state, {
                teams: {
                    [teamId]: {
                        $set: {
                            name,
                            unread,
                            typing
                        }
                    }
                }
            })
        }
        default:
            return state
    }
}