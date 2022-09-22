const path = require('path')
const sqlite3 = require('sqlite3')

export default {
    context: undefined,
    dbh: undefined,

    initializeModel: function(context, userPath) {
        this.context = context

        const filename = path.join(userPath, 'conversations.db')
        const dbh = new sqlite3.Database(filename)

        this.dbh = dbh
    },

    createTables: function() {
        const query = `
            CREATE TABLE IF NOT EXISTS conversations (
                team_id TEXT,
                conversation_id TEXT,
                conversation_type TEXT,
                last_message REAL,
                last_update REAL,
                PRIMARY KEY (team_id, conversation_id)
            )
        `

        this.dbh.run(query)
    },

    getConversation: function(teamId, conversationId, callback) {
        const query = `
            SELECT
                team_id,
                conversation_id,
                conversation_type,
                last_message,
                last_update
            FROM
                conversations
            WHERE
                team_id = ? AND
                conversation_id = ?
        `

        this.dbh.get(query, [teamId, conversationId], callback)
    },

    updateConversation: function(teamId, conversationId, conversationType, lastMessage) {
        const query = `
            INSERT INTO
                conversations
            (
                team_id,
                conversation_id,
                conversation_type,
                last_message,
                last_update
            ) VALUES (
                ?,
                ?,
                ?,
                ?,
                DATE()
            )
            ON CONFLICT (team_id, conversation_id) DO UPDATE SET
                last_message = ?,
                last_update = DATE()
        `

        this.dbh.run(query, [teamId, conversationId, conversationType, lastMessage, lastMessage])
    }
}