import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'

const { Label, List } = require('semantic-ui-react')

import { getConversationInfo } from '../actions/slack'

import _ from 'lodash'

function Team(props) {
    const { teamId, team: { name, conversations, unread, typing } } = props

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

    const [unreadConversations, setUnreadConversations] = useState([])

    /*
     * Merge the unread conversation list and the typing list to
     * come up with a single list of conversations to show.
     *
     */

    useEffect(() => {
        const unreadChannelMap = unread.reduce((acc, conversation) => {
            const channelId = conversation.id

            return {
                [channelId]: conversation,
                ...acc
            }
        }, {})

        Object.keys(typing).forEach((channelId) => {
            if (_.isUndefined(unreadChannelMap[channelId])) {
                unreadChannelMap[channelId] = {
                    id: channelId,
                    name: typing[channelId].name,
                    unreadCount: 0
                }
            }
        })

        setUnreadConversations(Object.values(unreadChannelMap))
    }, [unread, typing])

    return (
        <List>
            <List.Header>
                {name.toUpperCase()}
            </List.Header>
            {
                (unreadConversations.length > 0)
                    ? _.sortBy(unreadConversations, (conversation) => { return conversation.name }).map((conversation) => {
                        const key = `team-${teamId}-conversation-${conversation.id}`

                        return (
                            <List.Item key={key}>
                                <span style={{ "color": "#687b8b" }}>{conversation.name}</span>
                                {
                                    (conversation.unreadCount > 0) && (
                                        <span style={
                                            {
                                                marginLeft: "1em",
                                                color: "#f2711c",
                                                fontSize: "0.8em"
                                            }
                                        }>
                                            {conversation.unreadCount}
                                        </span>
                                    )
                                }
                                {
                                    (!_.isUndefined(typing[conversation.id])) && (
                                        <span style={
                                            {
                                                marginLeft: "1em",
                                                color: "#cdcddf"
                                            }
                                        }>
                                            ...
                                        </span>
                                    )
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