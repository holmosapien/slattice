import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import App from 'renderer/containers/app'
import Home from 'renderer/containers/home'
import Teams from 'renderer/containers/teams'
import Tests from 'renderer/containers/tests'

const ROUTES = {
    home: "/",
    teams: "/teams",
    tests: "/tests"
}

export default () => {
    return (
        <App>
            <Router>
                <Routes>
                    <Route exact path={ROUTES.home} element={<Home />} />
                    <Route path={ROUTES.teams} element={<Teams />} />
                    <Route path={ROUTES.tests} element={<Tests />} />
                </Routes>
            </Router>
        </App>
    )
}