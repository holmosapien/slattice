import { configureStore } from '@reduxjs/toolkit'

import createRootReducer from '../reducers'

const rootReducer = createRootReducer()

export function createStore(initialState) {
    return configureStore({
        reducer: rootReducer,
        initialState
    })
}