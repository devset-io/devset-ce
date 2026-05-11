/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const normalizeVersion = (value: string | undefined): string | null => {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const withoutRefPrefix = trimmed.replace(/^refs\/tags\//, '')
  const withoutVPrefix = withoutRefPrefix.replace(/^v(?=\d)/, '')
  return withoutVPrefix || null
}

const fallbackVersion = '0.1.0'
const githubTag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined
const releaseVersion =
  normalizeVersion(process.env.VITE_GIT_TAG) ??
  normalizeVersion(process.env.CI_COMMIT_TAG) ??
  normalizeVersion(githubTag) ??
  fallbackVersion
const uiVersion = normalizeVersion(process.env.VITE_UI_VERSION) ?? releaseVersion
const apiVersion = normalizeVersion(process.env.VITE_API_VERSION) ?? releaseVersion

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_UI_VERSION': JSON.stringify(uiVersion),
    'import.meta.env.VITE_API_VERSION': JSON.stringify(apiVersion),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Keep local dev requests same-origin from backend perspective.
            proxyReq.removeHeader('origin')
          })
        },
      },
      '/ws': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
