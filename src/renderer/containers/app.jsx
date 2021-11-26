import React from 'react'

export default function App(props) {
    const { children } = props

    return <React.Fragment>{children}</React.Fragment>
}