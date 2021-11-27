const { RTMClient } = require('@slack/rtm-api')
const _ = require('lodash')

let teams = {}

export function rtmConnect(context, token) {

    /*
     * See if we already have an RTM handle for this token.
     *
     */

    const teamId = Object.keys(teams).find((teamId) => teams[teamId].token == token)

    if (!_.isUndefined(teamId) && !_.isUndefined(teams[teamId]) && !_.isUndefined(teams[teamId].rtm)) {
        _processUnread(context, teamId)
        _processTyping(context, teamId, undefined)

        _sendTeamUpdate(context, teamId)

        return teams[teamId].rtm
    }

    const rtm = new RTMClient(token, { useRtmConnect: false })

    rtm.on('authenticated', (event) => {
        context.logger('AUTHENTICATED: ', event)

        context.window.webContents.send('slackAuthenticated', { token, event })

        const teamId = event.team.id
        const team = _handleAuthenticated(context, rtm, token, event)
        const teamName = teams[teamId].name

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
            const { name, lastRead } = team.conversations[channelId]

            context.logger(`${teamName}: fetching history for conversation ${name}`)

            _getConversationHistory(context, teamId, channelId, lastRead)
        })
    })

    rtm.on('ready', () => {
        context.logger('READY')
    })

    rtm.on('pong', (event) => {
        const teamId = rtm.activeTeamId

        _handlePong(context, teamId)
    })

    rtm.on('message', (event) => {
        context.logger('MESSAGE: ', event)

        const teamId = (event.team) ? event.team : rtm.activeTeamId

        _handleMessage(context, teamId, event)
    })

    rtm.on('user_typing', (event) => {
        context.logger('USER_TYPING: ', event)

        const teamId = rtm.activeTeamId

        _handleUserTyping(context, teamId, event)
    })

    rtm.on('channel_marked', (event) => {
        context.logger('CHANNEL MARKED: ', event)

        const teamId = rtm.activeTeamId

        _handleChannelMarked(context, teamId, event)
    })

    rtm.on('im_marked', (event) => {
        context.logger('IM MARKED: ', event)

        const teamId = rtm.activeTeamId

        _handleImMarked(context, teamId, event)
    })

    rtm.on('mpim_marked', (event) => {
        context.logger('MPIM MARKED: ', event)

        const teamId = rtm.activeTeamId

        _handleMpimMarked(context, teamId, event)
    })

    rtm.on('group_marked', (event) => {
        context.logger('GROUP MARKED: ', event)

        const teamId = rtm.activeTeamId

        _handleGroupMarked(context, teamId, event)
    })

    rtm.on('channel_joined', (event) => {
        context.logger('CHANNEL JOINED: ', event)

        const teamId = rtm.activeTeamId
        const channel = event.channel
        const channelId = channel.id

        _handleChannelJoined(context, teamId, channel)
    })

    rtm.on('group_joined', (event) => {
        context.logger('GROUP JOINED: ', event)

        const teamId = rtm.activeTeamId
        const group = event.channel
        const groupId = group.id

        _handleGroupJoined(context, teamId, group)
    })

    rtm.start()

    return rtm
}

export function executeTest(context, teamId, testType) {
    let channelId = undefined
    let destination = 'message'

    switch (testType) {
        case 'activeChannelMessage':
        {
            const channel = _.sample(teams[teamId].authenticationEvent.channels.filter((channel) => {
                const { is_member: isMember, is_open: isOpen, is_mpim: isIm } = channel

                return (isMember && !isIm)
            }))

            context.logger("[executeTest] active channel: ", channel)

            if (!_.isUndefined(channel)) {
                channelId = channel.id
            }

            break
        }
        case 'activeGroupMessage':
        {
            const group = _.sample(teams[teamId].authenticationEvent.groups.filter((group) => {
                const { is_open: isOpen, is_mpim: isIm } = group

                return (isOpen && !isIm)
            }))

            context.logger("[executeTest] active group: ", group)

            if (!_.isUndefined(group)) {
                channelId = group.id
            }

            break
        }
        case 'activeImMessage':
        {
            const im = _.sample(teams[teamId].authenticationEvent.ims.filter((im) => {
                const { is_open: isOpen } = im

                return isOpen
            }))

            context.logger("[executeTest] active IM: ", im)

            if (!_.isUndefined(im)) {
                channelId = im.id
            }

            break
        }
        case 'activeMpimMessage':
        {
            const channel = _.sample(teams[teamId].authenticationEvent.channels.filter((channel) => {
                const { is_member: isMember, is_open: isOpen, is_mpim: isIm } = channel

                return (isMember && isIm && isOpen)
            }))

            context.logger("[executeTest] active MPIM: ", channel)

            if (!_.isUndefined(channel)) {
                channelId = channel.id
            }

            break
        }
        case 'closedChannelMessage':
        {
            const channel = _.sample(teams[teamId].authenticationEvent.channels.filter((channel) => {
                const { is_member: isMember, is_open: isOpen, is_mpim: isIm } = channel

                return (!isMember && !isIm)
            }))

            context.logger("[executeTest] closed channel: ", channel)

            if (!_.isUndefined(channel)) {
                channelId = channel.id
            }

            break
        }
        case 'closedGroupMessage':
        {
            const group = _.sample(teams[teamId].authenticationEvent.groups.filter((group) => {
                const { is_open: isOpen, is_mpim: isIm } = group

                return (!isOpen && !isIm)
            }))

            context.logger("[executeTest] closed group: ", group)

            if (!_.isUndefined(group)) {
                channelId = group.id
            }

            break
        }
        case 'closedImMessage':
        {
            const im = _.sample(teams[teamId].authenticationEvent.ims.filter((im) => {
                const { is_open: isOpen } = im

                return !isOpen
            }))

            context.logger("[executeTest] closed IM: ", im)

            if (!_.isUndefined(im)) {
                channelId = im.id
            }

            break
        }
        case 'closedMpimMessage':
        {
            const channel = _.sample(teams[teamId].authenticationEvent.channels.filter((channel) => {
                const { is_member: isMember, is_open: isOpen, is_mpim: isIm } = channel

                return (isMember && isIm && !isOpen)
            }))

            context.logger("[executeTest] closed MPIM: ", channel)

            if (!_.isUndefined(channel)) {
                channelId = channel.id
            }

            break
        }
        case 'unknownUserImMessage':
        {

            /*
             * For this test we must find an IM session, then delete the user from the team's
             * "users" array. This will force a new lookup of that user's information.
             *
             */

            const luckyIm = _.sample(_.filter(teams[teamId].conversations, { isIm: true }))
            const imId = luckyIm.id
            const userId = luckyIm.userId
            const luckyUser = teams[teamId].users[userId]

            context.logger("[executeTest] unknown user: ", luckyUser)

            channelId = imId

            delete teams[teamId].conversations[channelId]

            break
        }
        case 'invalidChannelMessage':
            channelId = 'AABBCCDD'

            break
        case 'activeChannelTyping':
            const channel = _.sample(teams[teamId].conversations)

            channelId = channel.id
            destination = 'typing'

            break
        case 'unknownChannelTyping':
            channelId = 'AABBCCDD'
            destination = 'typing'

            break
        default:
            break
    }

    if (!_.isUndefined(channelId)) {
        if (destination == 'message') {
            const now = String(Date.now() / 1000)
            const event = { channel: channelId, ts: now }

            _handleMessage(context, teamId, event)
        } else if (destination == 'typing') {
            const event = { channel: channelId }

            _handleUserTyping(context, teamId, event)
        }
    }
}

function _handleAuthenticated(context, rtm, token, event) {
    const { id: teamId, name: teamName } = event.team

    let users = {}

    event.users.forEach((user) => {
        const { deleted, id, name, real_name: realName } = user

        if (deleted == false) {
            const displayName = realName || name

            users[id] = {
                id,
                displayName,
                name,
                realName,
                unreadCount: 0
            }
        }
    })

    let conversations = {}

    event.channels.forEach((channel) => {
        const { id, is_member: isMember, is_open: isOpen, is_mpim: isIm, last_read: lastRead, name } = channel

        if (isMember && (!isIm || (isIm && isOpen))) {
            conversations[id] = {
                id,
                isIm: false,
                isMpim: false,
                lastMessage: undefined,
                lastRead,
                name,
                unreadCount: 0
            }
        }
    })

    event.groups.forEach((group) => {
        const { id, is_open: isOpen, is_mpim: isMpim, last_read: lastRead, name, members } = group

        if (isOpen) {

            /*
             * If this is a multi-person IM group, then we should make the name the concatenation of the group members.
             *
             */

            let groupName = name
            let groupMembers = undefined

            if (isMpim) {
                groupName = _makeGroupName(members, users)
                groupMembers = members
            }

            conversations[id] = {
                id,
                isIm: false,
                isMpim,
                lastMessage: undefined,
                lastRead,
                name: groupName,
                unreadCount: 0
            }

            if (!_.isUndefined(groupMembers)) {
                conversations[id].members = groupMembers
            }
        }
    })

    event.ims.forEach((im) => {
        const { id, is_open: isOpen, last_read: lastRead, user: userId } = im

        if (isOpen && users[userId]) {
            const name = users[userId].displayName

            conversations[id] = {
                id,
                isIm: true,
                isMpim: false,
                lastMessage: undefined,
                lastRead,
                name,
                unreadCount: 0,
                userId
            }
        }
    })

    const team = {
        name: teamName,
        token,
        rtm,
        authenticationEvent: event,
        users,
        conversations,
        unread: {},
        typing: {}
    }

    teams[teamId] = team

    _sendTeamUpdate(context, teamId)

    return team
}

function _handlePong(context, teamId) {
    _processTyping(context, teamId, undefined)
}

function _handleMessage(context, teamId, event) {
    const { channel: channelId, subtype, ts } = event

    const team = teams[teamId]

    if (_.isUndefined(team)) {
        return
    }

    let lastMessage = ts
    let rollback = false

    if (subtype) {

        /*
         * We don't care about message updates, plus it just messes up our timestamps.
         *
         */

        if (subtype == 'message_changed') {
            return
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
        unreadCount: (rollback) ? 0 : 1
    }

    const conversation = team.conversations[channelId]

    if (_.isUndefined(conversation)) {
        teams[teamId].conversations[channelId] = channelInfo

        _getConversationInfo(context, teamId, channelId)
    } else {

        /*
         * Copy channel details from state.
         *
         */

        channelInfo.lastRead = conversation.lastRead
        channelInfo.name = conversation.name

        if (!_.isUndefined(conversation.members)) {
            channelInfo.members = conversation.members
        }

        const unreadCount = teams[teamId].conversations[channelId].unreadCount

        if (rollback) {
            channelInfo.unreadCount = (unreadCount > 0) ? unreadCount - 1 : 0
        } else {
            channelInfo.unreadCount = unreadCount + 1
        }

        teams[teamId].conversations[channelId] = channelInfo
    }

    _processUnread(context, teamId)
}

function _handleUserTyping(context, teamId, event) {
    const { channel: channelId } = event

    _processTyping(context, teamId, channelId)
}

function _handleChannelMarked(context, teamId, event) {
    _handleMarked(context, teamId, event)
}

function _handleImMarked(context, teamId, event) {
    const { channel: imId, ts } = event

    if (_.isUndefined(teams[teamId]) || _.isUndefined(teams[teamId].conversations[imId])) {
        context.logger(`Attempted to mark unknown IM ${imId} in team ${teamId} as read`)

        return
    }

    teams[teamId].conversations[imId].lastRead = ts
    teams[teamId].conversations[imId].unreadCount = 0

    /*
     * Get the latest info about the IM so we can see if there are
     * still any unread messages after the new mark.
     *
     */

    _getConversationHistory(context, teamId, imId, ts)
}

function _handleMpimMarked(context, teamId, event) {
    _handleMarked(context, teamId, event)
}

function _handleGroupMarked(context, teamId, event) {
    _handleMarked(context, teamId, event)
}

function _handleMarked(context, teamId, event) {
    const { channel: channelId, ts, unread_count: unreadCount } = event

    if (_.isUndefined(teams[teamId]) || _.isUndefined(teams[teamId].conversations[channelId])) {
        context.logger(`Attempted to mark unknown channel ${channelId} in team ${teamId} as read`)

        return
    }

    teams[teamId].conversations[channelId].lastRead = ts
    teams[teamId].conversations[channelId].unreadCount = unreadCount

    _processUnread(context, teamId)
}

function _handleChannelJoined(context, teamId, channel) {
    _handleJoined(context, teamId, channel)
}

function _handleGroupJoined(context, teamId, group) {
    _handleJoined(context, teamId, group)
}

function _handleJoined(context, teamId, event) {
    const { id: channelId, last_read: lastRead, latest, name } = event

    let lastMessage = undefined

    if (latest) {
        lastMessage = latest.ts
    }

    teams[teamId].conversations[channelId] = {
        lastMessage,
        lastRead,
        name,
        unreadCount: 0
    }

    _processUnread(context, teamId)
}

function _getUserInfo(context, teamId, userId) {
    const team = teams[teamId]

    team.rtm.webClient.users.info({
        user: userId
    })
    .then(({ user }) => {
        const { id: userId, name, real_name: realName } = user

        const displayName = realName || name

        if (_.isUndefined(team.users[userId])) {
            teams[teamId].users[userId] = {
                displayName,
                name,
                realName,
                unreadCount
            }
        }

        /*
         * See if we have any conversations that need the name filled out.
         *
         */

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
                    channelName = _makeGroupName(conversation.members, teams[teamId].users)
                }
            }

            if (!_.isUndefined(channelName)) {
                teams[teamId].conversations[channelId].name = channelName
            }
        })

        _refreshUI(context, teamId)
    })
}

function _getConversationInfo(context, teamId, channelId) {
    const team = teams[teamId]

    team.rtm.webClient.conversations.info({
        channel: channelId
    })
    .then(({ channel }) => {
        const { id: channelId, name, user: userId } = channel

        if (channel.is_im) {

            /*
             * If this is an IM, pull the user information if we don't already know who it is.
             *
             */

            const userId = channel.user

            teams[teamId].conversations[channelId].userId = userId

            if (_.isUndefined(team.users[userId])) {
                teams[teamId].conversations[channelId].name = userId

                _getUserInfo(context, teamId, userId)
            } else {
                teams[teamId].conversations[channelId].name = team.users[userId].displayName

                _refreshUI(context, teamId)
            }
        } else if (channel.is_mpim) {

            /*
             * If this is an MPIM, pull the group membership.
             *
             */

            teams[teamId].conversations[channelId].name = channelId

            _getConversationMembers(context, teamId, channelId)
        } else {
            teams[teamId].conversations[channelId].name = name

            /*
             * Now that we have a team name, we should update the UI.
             *
             */

            _refreshUI(context, teamId)
        }
    })
}

function _getConversationMembers(context, teamId, channelId) {
    const team = teams[teamId]

    team.rtm.webClient.conversations.members({
        channel: channelId
    })
    .then(({ members }) => {
        const users = team.users
        const groupName = _makeGroupName(members, users)

        teams[teamId].conversations[channelId].name = groupName
        teams[teamId].conversations[channelId].members = members

        _refreshUI(context, teamId)
    })
}

function _getConversationHistory(context, teamId, channelId, ts) {
    const team = teams[teamId]

    let request = {
        channel: channelId
    }

    if (ts && (Number(ts) > 0)) {
        request.oldest = ts
    }

    team.rtm.webClient.conversations.history(request)
    .then((conversation) => {
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

        teams[teamId].conversations[channelId].lastMessage = newestStr
        teams[teamId].conversations[channelId].unreadCount = messages.length

        _processUnread(context, teamId)
    })
}

function _makeGroupName(members, users) {
    let groupName = 'Unknown'

    if (!_.isUndefined(members)) {
        groupName = ''

        members.forEach((userId, index) => {
            const name = users[userId] ? users[userId].displayName : userId

            if (index > 0) {
                groupName += ' / '
            }

            groupName += name
        })
    }

    return groupName
}

function _processUnread(context, teamId) {
    let unread = {}

    Object.keys(teams[teamId].conversations).forEach((id) => {
        const { lastMessage, lastRead, name, unreadCount } = teams[teamId].conversations[id]

        if (lastMessage && (lastMessage > lastRead)) {
            unread[id] = {
                name,
                unreadCount
            }
        }
    })

    const teamName = teams[teamId].name
    const previouslyUnread = Object.keys(teams[teamId].unread).map((id) => teams[teamId].unread[id].name).join(' | ')
    const currentlyUnread = Object.keys(unread).map((id) => unread[id].name).join(' | ')
    const changed = !_.isEqual(teams[teamId].unread, unread)

    context.logger(`[_processUnread] ${teamName}: previous=`, previouslyUnread, ', current=', currentlyUnread, ', changed=', changed)

    if (changed) {
        teams[teamId].unread = unread

        _sendTeamUpdate(context, teamId)
    }
}

function _processTyping(context, teamId, channelId) {
    const now = Date.now() / 1000

    /*
     * Filter any typing events that are more than 10 seconds old.
     *
     */

    let typing = {}

    Object.keys(teams[teamId].typing).forEach((id) => {
        const { name, ts } = teams[teamId].typing[id]

        if (ts < now - 10) {
            return
        }

        if (channelId && (id == channelId)) {
            return
        }

        typing[id] = { name, ts }
    })

    /*
     * Add the current channel / user to the typing list.
     *
     */

    if (channelId) {
        const conversation = teams[teamId].conversations[channelId]
        const name = (_.isUndefined(conversation)) ? '-' : conversation.name

        typing[channelId] = { name, ts: now }
    }

    const teamName = teams[teamId].name
    const previouslyTyping = Object.keys(teams[teamId].typing).map((id) => teams[teamId].typing[id].name).join(' | ')
    const currentlyTyping = Object.keys(typing).map((id) => typing[id].name).join(' | ')
    const changed = !_.isEqual(teams[teamId].typing, typing)

    if (changed || channelId) {
        context.logger(`[_processTyping] ${teamName}: previous=`, previouslyTyping, ', current=', currentlyTyping, ', changed=', changed)
    }

    if (changed) {
        teams[teamId].typing = typing

        _sendTeamUpdate(context, teamId)
    }
}

function _refreshUI(context, teamId) {
    _processUnread(context, teamId)
    _processTyping(context, teamId, undefined)
}

function _sendTeamUpdate(context, teamId) {
    const { name, unread, typing } = teams[teamId]

    const update = { teamId, name, unread, typing }

    context.logger('[_sendTeamUpdate] sending update: ', update)

    context.window.webContents.send('teamUpdate', update)
}