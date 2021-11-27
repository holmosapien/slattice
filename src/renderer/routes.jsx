import React from 'react'
import { Switch, Route } from 'react-router'

import App from 'renderer/containers/app'
import Home from 'renderer/containers/home'
import Teams from 'renderer/containers/teams'
import Tests from 'renderer/containers/tests'

const ROUTES = {
    home: "/",
    teams: "/teams"
}

export default () => {
    return (
        <App>
            <Switch>
                <Route exact path={ROUTES.home} component={Home} />
                <Route path={ROUTES.teams} component={Teams} />
                <Route path={ROUTES.tests} component={Tests} />
            </Switch>
        </App>
    )
}