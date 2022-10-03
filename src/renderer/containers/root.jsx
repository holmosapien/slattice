import React from 'react'
import { Provider } from 'react-redux'

import Routes from '../routes'

export default function Root(props) {
    const { store } = props

    return (
        <Provider store={store}>
            <Routes />
        </Provider>
    )
}