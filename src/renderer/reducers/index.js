import { combineReducers } from 'redux'
import { connectRouter } from 'connected-react-router'

import slack from './slack'

export default function createRootReducer(history) {
    return combineReducers({
        router: connectRouter(history),
        slack
    })
}