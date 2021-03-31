import _ from 'lodash'
import update from 'immutability-helper'

import {
    REQUEST_CONFIG,
    RECEIVE_CONFIG
} from '../actions/config'

import {
    ADD_TEAM,
    RTM_AUTHENTICATED,
    RTM_MESSAGE,
    RTM_CHANNEL_MARKED,
    RTM_IM_MARKED,
    RTM_GROUP_MARKED,
    RTM_CHANNEL_JOINED,
    RTM_GROUP_JOINED,
    RECEIVE_USER_INFO,
    REQUEST_CONVERSATION_INFO,
    RECEIVE_CONVERSATION_INFO,
    RECEIVE_CONVERSATION_MEMBERS,
    RECEIVE_CONVERSATION_HISTORY
} from '../actions/slack'

const defaultSlackState = {
    'loadingConfig': false,
    'tokens': [],
    'teams': {}
}

export default function slack(state = defaultSlackState, action) {
    switch (action.type) {
        case REQUEST_CONFIG:
            return update(state, {
                'loadingConfig': {
                    $set: true
                }
            })
        case RECEIVE_CONFIG:
            let newState = {
                'loadingConfig': {
                    $set: false
                }
            }

            let newTokens = []

            action.config.tokens.forEach((token) => {
                if (state.tokens.includes(token) == false) {
                    newTokens.push(token)
                }
            })

            if (newTokens.length > 0) {
                newState.tokens = {
                    $push: newTokens
                }
            }

            return update(state, newState)
        case ADD_TEAM:
            if (state.tokens.includes(action.token) == false) {
                return update(state, {
                    'tokens': {
                        $push: [ action.token ]
                    }
                })
            }

            return state
        case RTM_AUTHENTICATED:
        {
            const rtm = action.rtm
            const token = action.token

            const { id: teamId, name: teamName } = action.event.team

            let users = {}

            action.event.users.forEach((user) => {
                const { deleted, id, name, real_name: realName } = user

                if (deleted == false) {
                    const displayName = realName || name

                    users[id] = {
                        displayName,
                        name,
                        realName,
                        unreadCount: 0
                    }
                }
            })

            let conversations = {}

            action.event.channels.forEach((channel) => {
                const { id, is_member: member, last_read: lastRead, name } = channel

                if (member) {
                    conversations[id] = {
                        lastMessage: undefined,
                        lastRead,
                        name,
                        unreadCount: 0,
                        loading: false
                    }
                }
            })

            action.event.groups.forEach((group) => {
                const { id, is_open: isOpen, last_read: lastRead, name, is_mpim: isIm, members } = group

                if (isOpen) {

                    /*
                     * If this is a multi-person IM group, then we should make the name the concatenation of the group members.
                     *
                     */

                    let groupName = name
                    let groupMembers = undefined

                    if (isIm) {
                        groupName = _makeGroupName(members, users)
                        groupMembers = members
                    }

                    conversations[id] = {
                        lastMessage: undefined,
                        lastRead,
                        name: groupName,
                        unreadCount: 0,
                        loading: false
                    }

                    if (!_.isUndefined(groupMembers)) {
                        conversations[id].members = groupMembers
                    }
                }
            })

            action.event.ims.forEach((im) => {
                const { id, is_open: isOpen, last_read: lastRead, user: userId } = im

                if (isOpen && users[userId]) {
                    const name = users[userId].displayName

                    conversations[id] = {
                        lastMessage: undefined,
                        lastRead,
                        name,
                        unreadCount: 0,
                        userId,
                        loading: false
                    }
                }
            })

            return update(state, {
                teams: {
                    [teamId]: {
                        $set: {
                            name: teamName,
                            token,
                            rtm,
                            users,
                            conversations,
                            unread: []
                        }
                    }
                }
            })
        }
        case RTM_MESSAGE:
        {
            const { teamId, event } = action
            const { channel: channelId, subtype, ts } = event

            const team = state.teams[teamId]

            let lastMessage = ts
            let rollback = false

            if (subtype) {

                /*
                 * Don't care about message updates, plus it just messes up our timestamps.
                 *
                 */

                if (subtype == 'message_changed') {
                    return state
                }

                /*
                 * If someone deleted a message, rollback the timestamps to the previous message.
                 *
                 */

                if (subtype == 'message_deleted') {
                    rollback = true

                    if (event.previous_message) {
                        lastMessage = event.previous_message.ts
                    } else {
                        lastMessage = "0"
                    }
                }
            }

            /*
             * Create a new channel record in case the channel does not yet exist in state.
             *
             * We'll override these defaults from state if we already know about the channel.
             *
             */

            let channelInfo = {
                lastMessage,
                lastRead: 0,
                name: channelId,
                unreadCount: (rollback) ? 0 : 1,
                loading: false
            }

            const conversation = team.conversations[channelId]

            if (!_.isUndefined(conversation)) {

                /*
                 * Copy channel details from state.
                 *
                 */

                channelInfo.lastRead = conversation.lastRead
                channelInfo.name = conversation.name

                if (!_.isUndefined(conversation.members)) {
                    channelInfo.members = conversation.members
                }

                const unreadCount = state.teams[teamId].conversations[channelId].unreadCount

                if (rollback) {
                    channelInfo.unreadCount = (unreadCount > 0) ? unreadCount = 1 : 0
                } else {
                    channelInfo.unreadCount = unreadCount + 1
                }
            }

            const newState = update(state, {
                teams: {
                    [teamId]: {
                        conversations: {
                            [channelId]: {
                                $set: channelInfo
                            }
                        }
                    }
                }
            })

            return _processUnread(teamId, newState)
        }
        case RTM_CHANNEL_MARKED:
        case RTM_GROUP_MARKED:
        {
            const { teamId, event } = action
            const { channel: channelId, ts, unread_count: unreadCount } = event

            const newState = update(state, {
                teams: {
                    [teamId]: {
                        conversations: {
                            [channelId]: {
                                lastRead: {
                                    $set: ts
                                },
                                unreadCount: {
                                    $set: unreadCount
                                }
                            }
                        }
                    }
                }
            })

            return _processUnread(teamId, newState)
        }
        case RTM_IM_MARKED:
        {
            const { teamId, event } = action
            const { channel: imId, ts } = event

            return update(state, {
                teams: {
                    [teamId]: {
                        conversations: {
                            [imId]: {
                                lastRead: {
                                    $set: ts
                                },
                                unreadCount: {
                                    $set: 0
                                }
                            }
                        }
                    }
                }
            })
        }
        case RTM_CHANNEL_JOINED:
        case RTM_GROUP_JOINED:
        {
            const { teamId, event } = action
            const { id: channelId, last_read: lastRead, latest, name } = event

            let lastMessage = undefined

            if (latest) {
                lastMessage = latest.ts
            }

            const newState = update(state, {
                teams: {
                    [teamId]: {
                        conversations: {
                            [channelId]: {
                                $set: {
                                    lastMessage,
                                    lastRead,
                                    name,
                                    unreadCount: 0,
                                    loading: false
                                }
                            }
                        }
                    }
                }
            })

            return _processUnread(teamId, newState)
        }
        case RECEIVE_USER_INFO:
        {
            const { teamId, user: { id: userId, name, real_name: realName } } = action

            const team = state.teams[teamId]
            const displayName = realName || name

            /*
             * Add the user to the user list if he's not already there.
             *
             */

            let userState = state

            if (_.isUndefined(team.users[userId])) {
                userState = update(state, {
                    teams: {
                        [teamId]: {
                            users: {
                                [userId]: {
                                    $set: {
                                        displayName,
                                        name,
                                        realName,
                                        unreadCount: 0
                                    }
                                }
                            }
                        }
                    }
                })
            }

            /*
             * See if we have any conversations that need the name filled out.
             *
             */

            let u = { teams: { [teamId]: { conversations: { } } } }

            Object.keys(team.conversations).forEach((channelId) => {
                const conversation = team.conversations[channelId]

                let channelName = undefined

                // DMs

                if (!_.isUndefined(conversation.userId) && (conversation.userId == userId)) {
                    channelName = displayName
                }

                // MPDMs

                if (!_.isUndefined(conversation.members)) {
                    if (conversation.members.includes(userId)) {
                        channelName = _makeGroupName(conversation.members, userState.teams[teamId].users)
                    }
                }

                if (!_.isUndefined(channelName)) {
                    u.teams[teamId].conversations[channelId] = { name: { $set: channelName } }
                }
            })

            if (!_.isEmpty(u.teams[teamId].conversations)) {
                return update(userState, u)
            }

            return state
        }
        case REQUEST_CONVERSATION_INFO:
        {
            const { teamId, channelId } = action

            const team = state.teams[teamId]

            let conversation = {
                lastMessage: 0,
                lastRead: 0,
                name: channelId,
                unreadCount: 0,
                loading: true
            }

            if (!_.isUndefined(team.conversations[channelId])) {
                conversation.lastMessage = team.conversations[channelId].lastMessage
                conversation.lastRead = team.conversations[channelId].lastRead
                conversation.name = team.conversations[channelId].name
                conversation.unreadCount = team.conversations[channelId].unreadCount
            }

            return update(state, {
                teams: {
                    [teamId]: {
                        conversations: {
                            [channelId]: {
                                $set: conversation
                            }
                        }
                    }
                }
            })
        }
        case RECEIVE_CONVERSATION_INFO:
            const { teamId, channel } = action
            const { id: channelId, name, user: userId } = channel

            const team = state.teams[teamId]

            let u = {
                teams: {
                    [teamId]: {
                        conversations: {
                            [channelId]: {
                                loading: {
                                    $set: false
                                }
                            }
                        }
                    }
                }
            }

            let conversationName = '-'

            if (channel.is_im) {
                if (team.users[userId]) {
                    conversationName = team.users[userId].displayName
                } else {
                    conversationName = userId
                }

                u.teams[teamId].conversations[channelId].userId = { $set: userId }
            } else {
                conversationName = name
            }

            u.teams[teamId].conversations[channelId].name = { $set: conversationName }

            return update(state, u)
        case RECEIVE_CONVERSATION_MEMBERS:
        {
            const { teamId, channelId, members } = action

            const users = state.teams[teamId].users
            const groupName = _makeGroupName(members, users)

            return update(state, {
                teams: {
                    [teamId]: {
                        conversations: {
                            [channelId]: {
                                name: {
                                    $set: groupName
                                },
                                members: {
                                    $set: members
                                }
                            }
                        }
                    }
                }
            })
        }
        case RECEIVE_CONVERSATION_HISTORY:
        {
            const { teamId, channelId, conversation } = action
            const messages = conversation.messages

            let newestNum = 0
            let newestStr = undefined

            messages.forEach((message) => {
                const ts = Number(message.ts)

                if (ts > newestNum) {
                    newestNum = ts
                    newestStr = message.ts
                }
            })

            const newState = update(state, {
                teams: {
                    [teamId]: {
                        conversations: {
                            [channelId]: {
                                lastMessage: {
                                    $set: newestStr
                                },
                                unreadCount: {
                                    $set: messages.length
                                }
                            }
                        }
                    }
                }
            })

            return _processUnread(teamId, newState)
        }
        default:
            return state
    }
}

function _makeGroupName(members, users) {
    let groupName = ''

    members.forEach((userId, index) => {
        const name = users[userId] ? users[userId].displayName : userId

        if (index > 0) {
            groupName += ' / '
        }

        groupName += name
    })

    return groupName
}

function _processUnread(teamId, state) {
    let unread = []

    Object.keys(state.teams[teamId].conversations).forEach((id) => {
        const { lastMessage, lastRead, name, unreadCount } = state.teams[teamId].conversations[id]

        if (lastMessage && (lastMessage > lastRead)) {
            unread.push({
                id,
                name,
                unreadCount
            })
        }
    })

    return update(state, {
        'teams': {
            [teamId]: {
                'unread': {
                    $set: unread
                }
            }
        }
    })
}