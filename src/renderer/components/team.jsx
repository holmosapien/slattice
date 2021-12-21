import React, { useState, useEffect } from 'react'
import { Label, List } from 'semantic-ui-react'
import _ from 'lodash'

import { getConversationInfo } from 'renderer/actions/slack'

function Team(props) {
    const { teamId, team: { name, unread, typing } } = props

    const [unreadConversations, setUnreadConversations] = useState([])

    /*
     * Merge the unread conversation list and the typing list to
     * come up with a single list of conversations to show.
     *
     */

    useEffect(() => {
        let unreadChannelMap = Object.keys(unread).reduce((acc, channelId) => {
            const conversation = {
                id: channelId,
                ...unread[channelId]
            }

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

    const onRefreshConversation = (conversationId) => {
        window.electron.ipcRenderer.refreshConversation(teamId, conversationId)
    }

    return (
        <List>
            <List.Header>
                {name.toUpperCase()}
            </List.Header>
            {
                (unreadConversations.length > 0)
                    ? _.sortBy(unreadConversations, (conversation) => { return conversation.name }).map((conversation) => {
                        const { id: conversationId, name: conversationName, unreadCount } = conversation

                        const key = `team-${teamId}-conversation-${conversationId}`

                        return (
                            <List.Item key={key}>
                                <a style={{ color: "#687b8b" }} onClick={() => onRefreshConversation(conversationId)}>{conversationName}</a>
                                {
                                    (conversation.unreadCount > 0) && (
                                        <span style={
                                            {
                                                marginLeft: "1em",
                                                color: "#f2711c",
                                                fontSize: "0.8em"
                                            }
                                        }>
                                            {unreadCount}
                                        </span>
                                    )
                                }
                                {
                                    (!_.isUndefined(typing[conversationId])) && (
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