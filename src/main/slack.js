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

    const rtm = new RTMClient(token, { useRtmConnect: true })

    rtm.on('authenticated', (event) => {
        context.logger('AUTHENTICATED: ', event)

        context.window.webContents.send('slackAuthenticated', { token, event })

        _handleAuthenticated(context, rtm, token, event)
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

export function refreshConversation(context, teamId, conversationId) {
    const team = teams[teamId]

    if (!_.isUndefined(team)) {
        const teamName = team.name
        const conversation = team.conversations[conversationId]

        if (!_.isUndefined(conversation)) {
            const { name } = conversation

            context.logger(`[refreshConversation] ${teamName}: fetching history for conversation ${name}`)

            _getConversationInfo(context, teamId, conversationId)
        }
    }
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

export function deleteTeam(context, teamId) {
    if (_.isUndefined(teams[teamId])) {
        context.logger(`[deleteTeam] Could not find team ${teamId}`)
    } else {
        context.logger(`[deleteTeam] Disconnecting team ${teamId}`)

        teams[teamId].rtm.disconnect()

        delete teams[teamId]
    }
}

function _handleAuthenticated(context, rtm, token, event) {
    const { id: teamId, name: teamName } = event.team

    const team = {
        name: teamName,
        token,
        rtm,
        authenticationEvent: event,
        users: {},
        conversations: {},
        status: {
            usersLoaded: false,
            conversationsLoaded: false,
            ready: false
        },
        unread: {},
        typing: {}
    }

    teams[teamId] = team

    _loadUsers(context, teamId)
    _loadConversations(context, teamId)

    _sendTeamUpdate(context, teamId)

    return team
}

function _handlePong(context, teamId) {
    const updated = _processTyping(context, teamId, undefined)

    /*
     * Update the front-end upon pong even if nothing else has changed.
     * This allows the front-end to detect whether our RTM session
     * has died and needs to be refreshed.
     *
     */

    if (!updated) {
        _sendTeamUpdate(context, teamId)
    }
}

function _handleMessage(context, teamId, event) {
    const { channel: channelId, subtype, ts } = event

    const team = teams[teamId]

    if (_.isUndefined(team)) {
        context.logger(`[_handleMessage] Received message for unknown team ${teamId}: `, event)

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

        /*
         * If the channel has been archived, remove it from our cache.
         *
         */

        if ((subtype == 'channel_archive') && (!_.isUndefined(team.conversations[channelId]))) {
            delete teams[teamId].conversations[channelId]

            _processUnread(context, teamId)

            return
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

async function _loadUsers(context, teamId) {
    for await (const page of teams[teamId].rtm.webClient.paginate('users.list')) {
        page.members.forEach((user) => {
            const { deleted, id, name, real_name: realName } = user

            if (deleted == false) {
                const displayName = realName || name

                teams[teamId].users[id] = {
                    id,
                    displayName,
                    name,
                    realName,
                    unreadCount: 0
                }
            }
        })
    }
}

async function _loadConversations(context, teamId) {
    const team = teams[teamId]
    const teamName = team.name

    const conversationTypes = 'public_channel,private_channel,mpim,im'

    const pages = teams[teamId].rtm.webClient.paginate('conversations.list', {
        types: conversationTypes,
        exclude_archived: true
    })

    for await (const page of pages) {
        page.channels.forEach((channel) => {
            const {
                id: conversationId,
                is_member: isMember,
                is_channel: isChannel,
                is_group: isGroup,
                is_im: isIm,
                is_mpim: isMpim,
                is_archived: isArchived,
                is_user_deleted: isDeleted,
                name
            } = channel

            /*
             * This isn't always defined. We'll assume if it's not in the results,
             * the answer is "true".
             *
             */

            const isOpen = (_.isUndefined(channel.is_open)) ? true : channel.is_open

            let conversation = {
                id: conversationId,
                isMember,
                isOpen,
                isChannel,
                isGroup,
                isIm,
                isMpim,
                isArchived,
                isDeleted,
                lastMessage: undefined,
                lastRead: undefined,
                name,
                unreadCount: 0
            }

            if (isIm) {
                conversation.name = channel.user
                conversation.userId = channel.user
            }

            teams[teamId].conversations[conversationId] = conversation

            /*
             * The data returned from the API gives us the channels, groups, IMs, and MPIMs,
             * but it doesn't tell us the last-read timestamps, last message timestamp, or how
             * many messages are unread. For that we have to loop through each channel, group,
             * and IM and fetch the details one-by-one.
             *
             * To reduce the load on the API, we only fetch channel data for channels for which
             * we are members.
             *
             */

            if ((isChannel && !isGroup && !isMpim && isMember) ||
                (isGroup && isMember && isOpen) ||
                (isMpim && isMember && isOpen) ||
                (isIm && isOpen && !isDeleted))
            {

                /*
                 * The `conversations.list` API does not return the open status
                 * for MPIMs. Since people in busy Slack teams can have hundreds
                 * of historical MPIMs and tie up the initialization process for
                 * minutes, let's skip fetching MPIM statuses if the last message
                 * was more than a month ago.
                 *
                 */

                context.model.getConversation(teamId, conversationId, function(err, row) {
                    let worthFetching = true
                    let fetchAllHistory = true

                    if (row) {
                        worthFetching = false
                        fetchAllHistory = false

                        if (row.last_message) {
                            const oldDate = new Date(0)

                            oldDate.setUTCSeconds(row.last_message)

                            const now = new Date()
                            const difference = (now - oldDate) / 1000 / 60 / 60 / 24

                            context.logger(`[_loadConversations] oldDate=`, oldDate, `, now=`, now, `, difference=${difference}`)

                            if (difference < 31) {
                                worthFetching = true
                            }
                        }
                    }

                    if (worthFetching) {
                        context.logger(`[_loadConversations] ${teamName}: Fetching details for conversation ${conversation.name}: `, channel)

                        _getConversationInfo(context, teamId, conversationId, fetchAllHistory)
                    } else {
                        context.logger(`[_loadConversations] ${teamName}: Skipping stale conversation ${conversation.name}: `, channel)
                    }
                })
            } else {
                context.logger(`[_loadConversations] Skipping uninteresting conversation ${conversationId} (${conversation.name}): `, channel)
            }
        })
    }
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
    .catch((error) => {
        context.logger(`[_getUserInfo] Failed to fetch details for user ${userId} in team ${teamId}: `, error)
    })
}

function _getConversationInfo(context, teamId, channelId, fetchAllHistory = false) {
    const team = teams[teamId]

    team.rtm.webClient.conversations.info({
        channel: channelId
    })
    .then(({ channel }) => {
        const {
            id: channelId,
            name,
            is_member: isMember,
            is_open: isOpen,
            is_channel: isChannel,
            is_group: isGroup,
            is_im: isIm,
            is_mpim: isMpim,
            is_archived: isArchived,
            is_user_deleted: isDeleted,
            last_read: lastRead,
            user: userId
        } = channel

        context.logger(`[_getConversationInfo] Processing channel `, channel)

        if (_.isUndefined(teams[teamId].conversations[channelId])) {
            teams[teamId].conversations[channelId] = {
                id: channelId,
                isMember,
                isOpen,
                isChannel,
                isGroup,
                isIm,
                isMpim,
                isArchived,
                isDeleted,
                lastMessage: undefined,
                lastRead,
                name,
                unreadCount: 0
            }
        } else {
            teams[teamId].conversations[channelId].isOpen = isOpen
            teams[teamId].conversations[channelId].isArchived = isArchived
            teams[teamId].conversations[channelId].isDeleted = isDeleted
            teams[teamId].conversations[channelId].lastRead = lastRead
        }

        if (isIm) {

            /*
             * If this is an IM, pull the user information if we don't already know who it is.
             *
             */

            teams[teamId].conversations[channelId].userId = userId

            if (_.isUndefined(team.users[userId])) {
                teams[teamId].conversations[channelId].name = userId

                _getUserInfo(context, teamId, userId)
            } else {
                teams[teamId].conversations[channelId].name = team.users[userId].displayName

                _refreshUI(context, teamId)
            }
        } else if (isMpim) {

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

        _getConversationHistory(context, teamId, channelId, lastRead, fetchAllHistory)
    })
    .catch((error) => {
        context.logger(`[_getConversationInfo] Failed to fetch details for conversation ${channelId} in team ${teamId}: `, error)
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
    .catch((error) => {
        context.logger(`[_getConversationMembers] Failed to fetch members for conversation ${channelId} in team ${teamId}: `, error)
    })
}

function _getConversationHistory(context, teamId, channelId, ts, fetchAllHistory = false) {
    const team = teams[teamId]

    let request = {
        channel: channelId
    }

    if (ts && (Number(ts) > 0) && !fetchAllHistory) {
        request.oldest = ts
        request.inclusive = true
    }

    team.rtm.webClient.conversations.history(request)
    .then((conversation) => {
        context.logger(`[_getConversationHistory] History for channel ${channelId} in team ${teamId}: `, request, conversation)

        const messages = conversation.messages

        let newestNum = 0
        let newestStr = undefined
        let unreadCount = 0

        messages.forEach((message) => {
            const messageTimestamp = Number(message.ts)

            if (messageTimestamp > newestNum) {
                newestNum = messageTimestamp
                newestStr = message.ts
            }

            if (ts && Number(ts)) {
                if (messageTimestamp > Number(ts)) {
                    unreadCount += 1
                }
            } else {
                unreadCount += 1
            }
        })

        teams[teamId].conversations[channelId].lastMessage = newestStr
        teams[teamId].conversations[channelId].unreadCount = unreadCount

        /*
         * Persist the conversation details to the model.
         *
         */

        const conversationName = teams[teamId].conversations[channelId].name
        const conversationType = _getConversationType(teams[teamId].conversations[channelId])

        context.model.updateConversation(teamId, channelId, conversationName, conversationType, newestStr)

        _processUnread(context, teamId)
    })
    .catch((error) => {
        context.logger(`[_getConversationHistory] Failed to fetch history for channel ${channelId} in team ${teamId}: `, error)
    })
}

function _getConversationType(conversation) {
    const {
        isChannel,
        isGroup,
        isIm,
        isMpim
    } = conversation

    if (isMpim) return "MPIM"
    if (isIm) return "IM"
    if (isGroup) return "GROUP"
    if (isChannel) return "CHANNEL"

    return "UNKNOWN"
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
        const ts = teams[teamId].typing[id].ts

        if (ts < now - 10) {
            return
        }

        if (channelId && (id == channelId)) {
            return
        }

        /*
         * Make sure the name for the channel is correct.
         *
         */

        let name = teams[teamId].typing[id].name

        const conversation = teams[teamId].conversations[id]

        if (!_.isUndefined(conversation)) {
            name = conversation.name
        }

        typing[id] = { name, ts }
    })

    /*
     * Add the current channel / user to the typing list.
     *
     */

    if (channelId) {
        const conversation = teams[teamId].conversations[channelId]

        let name = '-'

        if (_.isUndefined(conversation)) {
            _getConversationInfo(context, teamId, channelId)
        } else {
            name = conversation.name
        }

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

        return true
    }

    return false
}

function _refreshUI(context, teamId) {
    _processUnread(context, teamId)
    _processTyping(context, teamId, undefined)
}

function _sendTeamUpdate(context, teamId) {
    const { name, token, unread, typing } = teams[teamId]

    const update = { teamId, name, token, unread, typing }

    context.logger('[_sendTeamUpdate] sending update: ', update)

    context.window.webContents.send('teamUpdate', update)
}