import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

const { List, Segment } = require('semantic-ui-react')

import Team from './team'

import { loadConfig } from '../actions/config'
import { rtmConnect } from '../actions/slack'

import _ from 'lodash'

function Home() {
    const dispatch = useDispatch()

    useEffect(() => {
        dispatch(loadConfig())
    }, [])

    const { tokens, teams } = useSelector((state) => state.slack)

    useEffect(() => {
        Object.keys(tokens).forEach((token) => {
            if (tokens[token].connected == false) {
                dispatch(rtmConnect(token))
            }
        })
    }, [tokens])

    return (
        <Segment basic>
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