import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'

const { Label, List } = require('semantic-ui-react')

import { getConversationInfo } from '../actions/slack'

import _ from 'lodash'

function Team(props) {
    const { teamId, team: { name, conversations, unread } } = props

    const dispatch = useDispatch()

    useEffect(() => {
        Object.keys(conversations).forEach((channelId) => {
            const { name, loading } = conversations[channelId]

            if (!loading && (name == channelId)) {
                console.log("HAVE A NEW CHANNEL WE NEED TO LOOK UP: ", conversations[channelId])

                dispatch(getConversationInfo(teamId, channelId))
            }
        })
    }, [conversations])

    return (
        <List>
            <List.Header>
                {name.toUpperCase()}
            </List.Header>
            {
                (unread.length > 0)
                    ? _.sortBy(unread, (conversation) => { return conversation.name }).map((conversation) => {
                        const key = `team-${teamId}-conversation-${conversation.id}`

                        return (
                            <List.Item key={key}>
                                <span style={{ "color": "#687b8b" }}>{conversation.name}</span>
                                {
                                    (conversation.unreadCount > 0)
                                        ? <span style={
                                            {
                                                "marginLeft": "1em",
                                                "color": "#f2711c",
                                                "fontSize": "0.8em"
                                            }
                                        }>
                                            {conversation.unreadCount}
                                        </span>
                                        : null
                                }
                            </List.Item>
                        )
                    })
                    : <List.Item>
                        <span style={{ "color": "#687b8b" }}>No unread messages.</span>
                    </List.Item>
            }
        </List>
    )
}

export default Team