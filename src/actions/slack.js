const { RTMClient } = require('@slack/rtm-api')

export const ADD_TEAM                     = 'ADD_TEAM'
export const RTM_AUTHENTICATED            = 'RTM_AUTHENTICATED'
export const RTM_MESSAGE                  = 'RTM_MESSAGE'
export const RTM_CHANNEL_MARKED           = 'RTM_CHANNEL_MARKED'
export const RTM_IM_MARKED                = 'RTM_IM_MARKED'
export const RTM_GROUP_MARKED             = 'RTM_GROUP_MARKED'
export const RTM_CHANNEL_JOINED           = 'RTM_CHANNEL_JOINED'
export const RTM_GROUP_JOINED             = 'RTM_GROUP_JOINED'
export const RECEIVE_USER_INFO            = 'RECEIVE_USER_INFO'
export const REQUEST_CONVERSATION_INFO    = 'REQUEST_CONVERSATION_INFO'
export const RECEIVE_CONVERSATION_INFO    = 'RECEIVE_CONVERSATION_INFO'
export const RECEIVE_CONVERSATION_MEMBERS = 'RECEIVE_CONVERSATION_MEMBERS'
export const RECEIVE_CONVERSATION_HISTORY = 'RECEIVE_CONVERSATION_HISTORY'

export function addTeam(token) {
    return {
        type: ADD_TEAM,
        token
    }
}

export function rtmConnect(token) {
    const rtm = new RTMClient(token, { useRtmConnect: false })

    return (dispatch, getState) => {
        rtm.on('authenticated', (event) => {
            console.log('AUTHENTICATED: ', event)

            dispatch(handleAuthenticated(rtm, token, event))

            const teamId = event.team.id
            const state = getState()
            const team = state.slack.teams[teamId]

            /*
             * The data returned after authentication gives us the channels, IMs, and groups
             * with the last-read timestamps, but it doesn't tell us the last message timestamp
             * or how many messages are unread. For that we have to loop through each channel,
             * group, and IM and fetch the details one-by-one.
             *
             * To reduce the load on the API, we only fetch channel data for channels for which
             * we are members.
             *
             */

            Object.keys(team.conversations).forEach((channelId) => {
                const { lastRead } = team.conversations[channelId]

                dispatch(getConversationHistory(teamId, channelId, lastRead))
            })
        })

        rtm.on('ready', () => {
            console.log('READY: ', rtm)
        })

        rtm.on('message', (event) => {
            console.log('MESSAGE: ', event)

            const teamId = (event.team) ? event.team : rtm.activeTeamId

            dispatch(handleMessage(teamId, event))
        })

        rtm.on('channel_marked', (event) => {
            console.log('CHANNEL MARKED: ', event)

            const teamId = rtm.activeTeamId

            dispatch(handleChannelMarked(teamId, event))
        })

        rtm.on('im_marked', (event) => {
            console.log('IM MARKED: ', event)

            const teamId = rtm.activeTeamId

            dispatch(handleImMarked(teamId, event))

            /*
             * Get the latest info about the IM so we can see if there are
             * still any unread messages after the new mark.
             *
             */

            const { channel: channelId, ts } = event

            dispatch(getConversationHistory(teamId, channelId, ts))
        })

        rtm.on('group_marked', (event) => {
            console.log('GROUP MARKED: ', event)

            const teamId = rtm.activeTeamId

            dispatch(handleGroupMarked(teamId, event))
        })

        rtm.on('channel_joined', (event) => {
            console.log("CHANNEL JOINED: ", event)

            const teamId = rtm.activeTeamId
            const channel = event.channel
            const channelId = channel.id

            dispatch(handleChannelJoined(teamId, channel))
        })

        rtm.on('group_joined', (event) => {
            console.log("GROUP JOINED: ", event)

            const teamId = rtm.activeTeamId
            const group = event.channel
            const groupId = group.id

            dispatch(handleGroupJoined(teamId, group))
        })

        rtm.start()
    }
}

export function handleAuthenticated(rtm, token, event) {
    return {
        type: RTM_AUTHENTICATED,
        rtm,
        token,
        event
    }
}

export function handleMessage(teamId, event) {
    return {
        type: RTM_MESSAGE,
        teamId,
        event
    }
}

export function handleChannelMarked(teamId, event) {
    return {
        type: RTM_CHANNEL_MARKED,
        teamId,
        event
    }
}

export function handleImMarked(teamId, event) {
    return {
        type: RTM_IM_MARKED,
        teamId,
        event
    }
}

export function handleGroupMarked(teamId, event) {
    return {
        type: RTM_GROUP_MARKED,
        teamId,
        event
    }
}

export function handleChannelJoined(teamId, event) {
    return {
        type: RTM_CHANNEL_JOINED,
        teamId,
        event
    }
}

export function handleGroupJoined(teamId, event) {
    return {
        type: RTM_GROUP_JOINED,
        teamId,
        event
    }
}

export function getUserInfo(teamId, userId) {
    return (dispatch, getState) => {
        const state = getState()
        const team = state.slack.teams[teamId]

        team.rtm.webClient.users.info({
            user: userId
        })
        .then((response) => {
            dispatch(receiveUserInfo(teamId, response.user))
        })
    }
}

export function receiveUserInfo(teamId, user) {
    console.log("USER INFO [", userId, "]: ", user)

    return {
        type: RECEIVE_USER_INFO,
        teamId,
        user
    }
}

export function getConversationInfo(teamId, channelId) {
    return (dispatch, getState) => {
        const state = getState()
        const team = state.slack.teams[teamId]

        dispatch(requestConversationInfo(teamId, channelId))

        team.rtm.webClient.conversations.info({
            channel: channelId
        })
        .then((response) => {

            /*
             * If this is an IM, pull the user information if we don't already know who it is.
             *
             */

            if (response.channel.is_im) {
                const userId = response.channel.user

                if (_.isUndefined(team.users[userId])) {
                    dispatch(getUserInfo(teamId, userId))
                }
            }

            if (response.channel.is_mpim) {
                dispatch(getConversationMembers(teamId, channelId))
            }

            dispatch(receiveConversationInfo(teamId, response.channel))
        })
    }
}

export function requestConversationInfo(teamId, channelId) {
    return {
        type: REQUEST_CONVERSATION_INFO,
        teamId,
        channelId
    }
}

export function receiveConversationInfo(teamId, channel) {
    console.log("CONVERSATION INFO: ", channel)

    return {
        type: RECEIVE_CONVERSATION_INFO,
        teamId,
        channel
    }
}

export function getConversationMembers(teamId, channelId) {
    return (dispatch, getState) => {
        const state = getState()
        const team = state.slack.teams[teamId]

        team.rtm.webClient.conversations.members({
            channel: channelId
        })
        .then((response) => {
            dispatch(receiveConversationMembers(teamId, channelId, response.members))
        })
    }
}

export function receiveConversationMembers(teamId, channelId, members) {
    console.log("CONVERSATION MEMBERS [", channelId, "]: ", members)

    return {
        type: RECEIVE_CONVERSATION_MEMBERS,
        teamId,
        channelId,
        members
    }
}

export function getConversationHistory(teamId, channelId, ts) {
    return (dispatch, getState) => {
        const state = getState()
        const team = state.slack.teams[teamId]

        let request = {
            'channel': channelId
        }

        if (ts && (Number(ts) > 0)) {
            request.oldest = ts
        }

        team.rtm.webClient.conversations.history(request)
        .then((response) => {
            dispatch(receiveConversationHistory(teamId, channelId, response))
        })
    }
}

export function receiveConversationHistory(teamId, channelId, conversation) {
    return {
        type: RECEIVE_CONVERSATION_HISTORY,
        teamId,
        channelId,
        conversation
    }
}