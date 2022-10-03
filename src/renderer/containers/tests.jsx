import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { List, Segment } from 'semantic-ui-react'

function Tests(props) {
    const { teams } = useSelector((state) => state.slack)

    const requestTest = (teamId, testType) => {
        console.log(`[requestTest] Requesting test type ${testType} in team ${teamId}`)

        window.electron.ipcRenderer.requestTest(teamId, testType)
    }

    return (
        <Segment basic>
            <List>
                {
                    Object.keys(teams).map((teamId) => {
                        const { name } = teams[teamId]

                        const rowKey = `tests-${teamId}`

                        return (
                            <React.Fragment key={rowKey}>
                                <List.Header>
                                    {name.toUpperCase()}
                                </List.Header>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'activeChannelMessage')}>Message in active channel</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'activeGroupMessage')}>Message in active group</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'activeImMessage')}>Message in active IM</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'activeMpimMessage')}>Message in active MPIM</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'closedChannelMessage')}>Message from closed channel</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'closedGroupMessage')}>Message from closed group</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'closedImMessage')}>Message from closed IM</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'closedMpimMessage')}>Message from closed MPIM</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'unknownUserImMessage')}>IM from unknown user</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'invalidChannelMessage')}>Message from invalid channel</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'activeChannelTyping')}>Typing in active channel</a>
                                </List.Item>
                                <List.Item>
                                    <a onClick={() => requestTest(teamId, 'unknownChannelTyping')}>Typing in unknown channel</a>
                                </List.Item>
                            </React.Fragment>
                        )
                    })
                }
            </List>
            <div style={
                {
                    position: "fixed",
                    left: "1em",
                    right: "1em",
                    bottom: "1em",
                    textAlign: "right"
                }
            }>
                <Link to="/">Home</Link>
            </div>
        </Segment>
    )
}

export default Tests