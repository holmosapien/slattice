import React from 'react'
import { Switch, Route } from 'react-router'

import routes from './constants/routes'

import App from './containers/app'
import HomePage from './containers/home'
import Teams from './containers/teams'

export default () => {
    return (
        <App>
            <Switch>
                <Route exact path={routes.HOME} component={HomePage} />
                <Route path={routes.TEAMS} component={Teams} />
            </Switch>
        </App>
    )
}