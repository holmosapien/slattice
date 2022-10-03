import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { List, Segment } from 'semantic-ui-react'
import _ from 'lodash'

import SlackBridge from 'renderer/components/bridge'
import Team from 'renderer/components/team'

import { loadConfig } from 'renderer/actions/config'
import { requestTokenConnection } from 'renderer/actions/slack'

function Home() {
    const dispatch = useDispatch()

    useEffect(() => {
        dispatch(loadConfig())
    }, [])

    const { tokens, teams } = useSelector((state) => state.slack)

    useEffect(() => {
        Object.keys(tokens).forEach((userToken) => {
            if (tokens[userToken].connected == false) {
                dispatch(requestTokenConnection(tokens[userToken]))
            }
        })
    }, [tokens])

    return (
        <Segment basic>
            <SlackBridge />
            <List>
                {
                    _.sortBy(Object.keys(teams), (teamId) => { return teamId }).map((teamId) => {
                        const key = `team-${teamId}`

                        return (
                            <List.Item key={key}>
                                <Team teamId={teamId} team={teams[teamId]} />
                            </List.Item>
                        )
                    })
                }
            </List>
            <div style={
                {
                    position: "fixed",
                    left: "1em",
                    right: "1em",
                    bottom: "1em"
                }
            }>
                <Link to="/teams">Manage Slack teams</Link>
            </div>
        </Segment>
    )
}

export default Home