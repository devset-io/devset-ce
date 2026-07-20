/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './core/i18n/I18nProvider'
import './index.css'
import '@xyflow/react/dist/style.css'
import './shared/components/AceEditor.css'
import './core/layout/AppLayout.css'
import './features/flow-builder/flow-builder.css'
import './features/playground/playground.css'
import './features/message-dispatch/message-dispatch.css'
import './features/schema-repo/schema-repo.css'
import './features/kafka-live/kafka-live.css'
import './features/workflow-runs/workflow-runs.css'
import './features/settings/settings.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
)
