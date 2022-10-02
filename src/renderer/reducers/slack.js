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
    TEAM_UPDATE,
    CLEAN_TOKENS,
    DELETE_TEAM
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
            const { teamId, token, name, unread, typing } = action

            const now = new Date()

            return update(state, {
                teams: {
                    [teamId]: {
                        $set: {
                            name,
                            token,
                            unread,
                            typing,
                            lastUpdate: now
                        }
                    }
                }
            })
        }
        case CLEAN_TOKENS:
        {

            /*
             * Filter bad tokens.
             *
             */

            const badTokens = Object.keys(state.tokens).filter((token) => {
                if (state.tokens[token].connected) {
                    const teamId = Object.keys(state.teams).find((teamId) => state.teams[teamId].token == token)

                    if (_.isUndefined(teamId)) {
                        return true
                    }
                }

                return false
            })

            if (badTokens.length > 0) {
                console.log("removing tokens ", badTokens, " from config")

                return update(state, {
                    tokens: {
                        $unset: badTokens
                    }
                })
            }
        }
        case DELETE_TEAM:
        {
            const { teamId, token } = action

            let u = {
                teams: {
                    $unset: [ teamId ]
                }
            }

            if (!_.isUndefined(token)) {
                u.tokens = {
                    $unset: [ token ]
                }
            }

            return update(state, u)
        }
        default:
            return state
    }
}