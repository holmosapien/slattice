import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Divider, Form, List, Message, Segment } from 'semantic-ui-react'
import _ from 'lodash'

import { saveConfig } from 'renderer/actions/config'
import { addTeam, deleteTeam } from 'renderer/actions/slack'

function TeamList({ teams }) {
    const dispatch = useDispatch()

    const onRemoveTeam = (teamId) => {
        dispatch(deleteTeam(teamId))
    }

    return (
        <List>
            <List.Header>TEAMS</List.Header>
            <List.Content>
            {
                Object.keys(teams).map((teamId) => {
                    return (
                        <List.Item key={teamId}>
                            <span style={{ color: "#687b8b" }}>{teams[teamId].name}</span>
                            <a style={{ color: "#ff7b8b", float: "right" }} onClick={() => onRemoveTeam(teamId)}>Remove</a>
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
    const [userToken, setUserToken] = useState('')
    const [clientToken, setClientToken] = useState('')
    const [clientCookie, setClientCookie] = useState('')

    const { tokens, teams } = useSelector((state) => state.slack)

    useEffect(() => {
        const config = {
            tokens: Object.keys(tokens).filter((userToken) => {
                return userToken.startsWith('xoxp')
            }).map((userToken) => {
                const { clientToken, clientCookie } = tokens[userToken]

                return {
                    userToken,
                    clientToken,
                    clientCookie
                }
            })
        }

        dispatch(saveConfig(config))
    }, [tokens])

    const onUpdateUserToken = (e, { value }) => {
        setUserToken(value)
    }

    const onUpdateClientToken = (e, { value }) => {
        setClientToken(value)
    }

    const onUpdateClientCookie = (e, { value }) => {
        setClientCookie(value)
    }

    const onUseLegacyToken = (e) => {
        let token = {
            userToken: userToken,
            clientToken: undefined,
            clientCookie: undefined
        }

        if ((clientToken != '') && (clientCookie != '')) {
            token.clientToken = clientToken
            token.clientCookie = clientCookie
        }

        dispatch(addTeam(token))

        setUserToken('')
        setClientToken('')
        setClientCookie('')
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
                <Form.Input
                    label="User Token"
                    placeholder="xoxp-41521542796-42222584871-183664996856-5378ee4ba563403faa9d5ec31f205d8c"
                    value={userToken}
                    onChange={onUpdateUserToken}
                />
                <Message>
                    The client token and cookie are optional, and are only used to help improve the
                    performance of the initial sync of the Slack team's state.
                </Message>
                <Form.Input
                    label="Client Token"
                    placeholder="xoxc-766545737440-102539214108-9802303573610-4d55fa15a7f00498b89e4b77dc0e57de236923df38d6f42b4b68f681c7a4f299"
                    value={clientToken}
                    onChange={onUpdateClientToken}
                />
                <Form.Input
                    label="Client Cookie"
                    placeholder="xoxd-gwNDctMUVDQjlCMDMwMzMyCjY1MjVFOUQyLUQyRTQtNENFQS1BMUQyLTNCOEJERTk2NDczMgpFNDY0RjUwQy0yOTgyLTRENTgtOTRBNy00QzBFNzhFMUNCRjcKOTkzMTJFNzEtNjFBRS00NDlCLTlGQjAtQjkwNkM0REY1MTMyCjUxNjNFQTM0LT"
                    value={clientCookie}
                    onChange={onUpdateClientCookie}
                />
                <Form.Button primary onClick={onUseLegacyToken}>Add</Form.Button>
            </Form>
            <div style={
                {
                    position: "fixed",
                    left: "1em",
                    right: "1em",
                    bottom: "1em"
                }
            }>
                <Link to="/">Home</Link> | <Link to="/tests">Tests</Link>
            </div>
        </Segment>
    )
}