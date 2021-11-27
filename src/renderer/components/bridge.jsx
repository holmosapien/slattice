import { useEffect } from "react"
import { useDispatch } from "react-redux"

import { handleAuthenticated, handleTeamUpdate } from "renderer/actions/slack"

export default function SlackBridge(props) {
    const dispatch = useDispatch()

    useEffect(() => {
        window.electron.ipcRenderer.on('log', (...args) => {
            console.log('[main] ', ...args)
        })

        window.electron.ipcRenderer.on('rtmConnect', (token) => {
            console.log(`[rtmConnect] ${token}`)
        })

        window.electron.ipcRenderer.on('slackAuthenticated', ({ token, event }) => {
            console.log(`[slackAuthenticated] token=${token}, event=`, event)

            dispatch(handleAuthenticated(token, event))
        })

        window.electron.ipcRenderer.on('teamUpdate', ({ teamId, name, unread, typing }) => {
            console.log(`[teamUpdate]: teamId=${teamId}, name=${name}, unread=`, unread, ', typing=', typing)

            dispatch(handleTeamUpdate(teamId, name, unread, typing))
        })
    }, [])

    return null
}