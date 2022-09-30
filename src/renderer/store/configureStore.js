import { configureStore } from '@reduxjs/toolkit'
import thunk from 'redux-thunk'

import createRootReducer from '../reducers'

const rootReducer = createRootReducer()

export function createStore(initialState) {
    return configureStore({
        middleware: [thunk],
        reducer: rootReducer,
        initialState
    })
}