import React from 'react'
import { createRoot } from 'react-dom/client'

import Root from './containers/root'

import { createStore } from './store/configureStore'

const container = document.getElementById('root')!
const root = createRoot(container)
const store = createStore()

root.render(<Root store={store} />)