/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React from 'react'
import { msg } from '../../../../../shared/utils/i18n'
import type { DispatchTabBarProps } from '../../../types/messageDispatch.view.types'

/**
 * Postman-style tab bar for the message-dispatch request area.
 * Each tab selects a request; the trailing "+" opens a new scratch tab.
 */
export const DispatchTabBar = React.memo(function DispatchTabBar({
  tabs,
  onSelect,
  onClose,
  onNewTab,
}: DispatchTabBarProps) {
  const closeLabel = msg('Zamknij kartę', 'Close tab')
  const newTabLabel = msg('Nowa karta', 'New tab')

  return (
    <div className="dispatch-tabbar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`dispatch-tab ${tab.isActive ? 'is-active' : ''}`}
        >
          <button
            type="button"
            className="dispatch-tab__label"
            aria-current={tab.isActive ? 'true' : undefined}
            onClick={() => onSelect(tab.id)}
          >
            {tab.broker ? (
              <span
                className={`dispatch-tab__broker dispatch-tab__broker--${tab.broker}`}
                aria-hidden="true"
              >
                {tab.broker === 'kafka' ? 'Kafka' : 'Rabbit'}
              </span>
            ) : null}
            <span
              className={`dispatch-tab__format dispatch-tab__format--${tab.contentMode}`}
              aria-hidden="true"
            >
              {tab.contentMode === 'protobuf' ? 'Proto' : 'JSON'}
            </span>
            <span className="dispatch-tab__title">{tab.title}</span>
          </button>
          <button
            type="button"
            className="dispatch-tab__close"
            aria-label={`${closeLabel}: ${tab.title}`}
            onClick={() => onClose(tab.id)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
      <button
        type="button"
        className="dispatch-tabbar__new"
        aria-label={newTabLabel}
        onClick={onNewTab}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  )
})
