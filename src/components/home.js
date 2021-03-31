import React, { Component } from 'react'
import { connect } from 'react-redux'

const { Input, List, Segment } = require('semantic-ui-react')

import Team from './team'

import { loadConfig, saveConfig } from '../actions/config'
import { addTeam, rtmConnect } from '../actions/slack'

import _ from 'lodash'

class Home extends Component {
    constructor() {
        super()

        this.state = {
            loaded: false,
            addNewTeam: false,
            newToken: ''
        }
    }

    componentDidMount() {
        const { dispatch } = this.props

        dispatch(loadConfig())
    }

    componentDidUpdate(prevProps) {
        const { dispatch, loadingConfig: isLoading, tokens: newTokens } = this.props
        const { loadingConfig: wasLoading, tokens: oldTokens } = prevProps

        let foundNewToken = false

        newTokens.forEach((token) => {
            if (oldTokens.includes(token) == false) {
                dispatch(rtmConnect(token))

                foundNewToken = true
            }
        })

        /*
         * If we have a new token and it's not just because we loaded the configuration file,
         * save the updated configuration file.
         *
         */

        if (foundNewToken && (! wasLoading) && (! isLoading)) {
            const config = { 'tokens': newTokens }

            console.log('SAVING CONFIGURATION FILE: ', config)

            dispatch(saveConfig(config))
        }
    }

    onAddTeam = () => {
        this.setState({ addNewTeam: true })
    }

    onUpdateNewToken = (e, props) => {
        if (props) {
            // onChange

            const { value } = props

            this.setState({ newToken: value })
        } else {
            // onKeyPress

            if (e.key == 'Enter') {
                const { dispatch } = this.props
                const { newToken } = this.state

                dispatch(addTeam(newToken))

                this.setState({
                    addNewTeam: false,
                    newToken: ''
                })
            }
        }
    }

    onCancelAddTeam = () => {
        this.setState({
            addNewTeam: false,
            newToken: ''
        })
    }

    render() {
        const { teams } = this.props
        const { addNewTeam, newToken } = this.state

        return (
            <Segment basic>
                <List>
                    {
                        _.sortBy(Object.keys(teams), (teamId) => { return teamId }).map((teamId) => {
                            const key = `team-${teamId}`

                            return (
                                <List.Item key={key}>
                                    <Team teamId={teamId} team={teams[teamId]} />
                                </List.Item>
                            )
                        })
                    }
                </List>
                <div style={
                    {
                        "position": "fixed",
                        "left": "1em",
                        "right": "1em",
                        "bottom": "1em"
                    }
                }>
                    {
                        (addNewTeam)
                            ? <div>
                                <Input fluid placeholder="Slack API Token" value={newToken} onKeyPress={this.onUpdateNewToken} onChange={this.onUpdateNewToken} />
                                <a onClick={this.onCancelAddTeam}>Cancel</a>
                            </div>
                            : <a onClick={this.onAddTeam}>Add a Slack team</a>
                    }
                </div>
            </Segment>
        )
    }
}

export default connect((state) => state.slack)(Home)