import React from 'react'
import { Switch, Route } from 'react-router'

import App from './containers/app'
import HomePage from './containers/home'
import Teams from './containers/teams'

const ROUTES = {
    home: "/",
    teams: "/teams"
}

export default () => {
    return (
        <App>
            <Switch>
                <Route exact path={ROUTES.home} component={HomePage} />
                <Route path={ROUTES.teams} component={Teams} />
            </Switch>
        </App>
    )
}