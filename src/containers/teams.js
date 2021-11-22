import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

const { Divider, Form, List, Message, Segment } = require('semantic-ui-react')

import { saveConfig } from '../actions/config'
import { addTeam } from '../actions/slack'

const _ = require('lodash')

function TeamList({ teams }) {
    const onRemoveTeam = () => {
        return
    }

    return (
        <List>
            <List.Header>TEAMS</List.Header>
            <List.Content>
            {
                Object.keys(teams).map((teamId) => {
                    return (
                        <List.Item>
                            <span style={{ color: "#687b8b" }}>{teams[teamId].name}</span>
                            <a style={{ color: "#ff7b8b", float: "right" }} onClick={onRemoveTeam}>Remove</a>
                        </List.Item>
                    )
                })
            }
            </List.Content>
        </List>
    )
}

export default function Teams() {
    const dispatch = useDispatch()

    const [authUrl, setAuthUrl] = useState(undefined)
    const [newToken, setNewToken] = useState('')

    const { tokens, teams } = useSelector((state) => state.slack)

    useEffect(() => {
        const configTokens = Object.keys(tokens)
        const config = { tokens: configTokens }

        dispatch(saveConfig(config))
    }, [tokens])

    const onUpdateNewToken = (e, { value }) => {
        setNewToken(value)
    }

    const onUseLegacyToken = (e) => {
        dispatch(addTeam(newToken))

        setNewToken('')
    }

    return (
        <Segment basic>
            <TeamList teams={teams} />
            {
                !_.isUndefined(authUrl) && (
                    <a target="_blank" href={authUrl}>Add a new team</a>
                )
            }
            <Divider />
            <Message>
                If you have a legacy Slack API token, you can enter it here.
            </Message>
            <Form>
                <Form.Group>
                    <Form.Input
                        placeholder="Slack API Token"
                        value={newToken}
                        onChange={onUpdateNewToken}
                    />
                    <Form.Button primary onClick={onUseLegacyToken}>Add</Form.Button>
                </Form.Group>
            </Form>
            <div style={
                {
                    position: "fixed",
                    left: "1em",
                    right: "1em",
                    bottom: "1em"
                }
            }>
                <Link to="/">Home</Link>
            </div>
        </Segment>
    )
}