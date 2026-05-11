/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useDeferredValue, useMemo, useState } from 'react'
import { useI18n, type Locale } from '../../core/i18n/I18nProvider'
import functionStudioMarkdownPl from '../../docs/content/function-studio.md?raw'
import functionStudioMarkdownEn from '../../docs/content/function-studio.en.md?raw'
import flowBuilderManagementMarkdownPl from '../../docs/content/flow-builder-management.md?raw'
import flowBuilderManagementMarkdownEn from '../../docs/content/flow-builder-management.en.md?raw'
import flowBuilderMarkdownPl from '../../docs/content/flow-builder.md?raw'
import flowBuilderMarkdownEn from '../../docs/content/flow-builder.en.md?raw'
import gettingStartedMarkdownPl from '../../docs/content/getting-started.md?raw'
import gettingStartedMarkdownEn from '../../docs/content/getting-started.en.md?raw'
import brokersMarkdownPl from '../../docs/content/brokers.md?raw'
import brokersMarkdownEn from '../../docs/content/brokers.en.md?raw'
import messageDispatchMarkdownPl from '../../docs/content/message-dispatch.md?raw'
import messageDispatchMarkdownEn from '../../docs/content/message-dispatch.en.md?raw'
import workflowFunctionsMarkdownPl from '../../docs/content/workflow-functions.md?raw'
import workflowFunctionsMarkdownEn from '../../docs/content/workflow-functions.en.md?raw'
import { SafeMarkdown } from './components/SafeMarkdown'

type DocArticle = {
  id: string
  title: string
  subtitle: string
  markdown: string
}

type DocArticleDefinition = {
  id: string
  markdown: string
}

type DocHeading = {
  id: string
  label: string
  level: 2 | 3
}

const DOC_ARTICLES: Record<Locale, DocArticleDefinition[]> = {
  pl: [
    { id: 'getting-started', markdown: gettingStartedMarkdownPl },
    { id: 'flow-builder-management', markdown: flowBuilderManagementMarkdownPl },
    { id: 'flow-builder', markdown: flowBuilderMarkdownPl },
    { id: 'function-studio', markdown: functionStudioMarkdownPl },
    { id: 'brokers', markdown: brokersMarkdownPl },
    { id: 'message-dispatch', markdown: messageDispatchMarkdownPl },
    { id: 'workflow-functions', markdown: workflowFunctionsMarkdownPl },
  ],
  en: [
    { id: 'getting-started', markdown: gettingStartedMarkdownEn },
    { id: 'flow-builder-management', markdown: flowBuilderManagementMarkdownEn },
    { id: 'flow-builder', markdown: flowBuilderMarkdownEn },
    { id: 'function-studio', markdown: functionStudioMarkdownEn },
    { id: 'brokers', markdown: brokersMarkdownEn },
    { id: 'message-dispatch', markdown: messageDispatchMarkdownEn },
    { id: 'workflow-functions', markdown: workflowFunctionsMarkdownEn },
  ],
}

const scoreArticle = (article: DocArticle, query: string) => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return 1
  }

  const title = article.title.toLowerCase()
  const markdown = article.markdown.toLowerCase()
  const titleBoost = title.includes(normalizedQuery) ? 20 : 0
  const contentMatches = markdown.split(normalizedQuery).length - 1
  return titleBoost + contentMatches
}

const estimateReadTime = (markdown: string) => {
  const plainText = markdown.replace(/[#_*`>\-\n]/g, ' ')
  const words = plainText.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')

const collectHeadings = (markdown: string): DocHeading[] => {
  const slugCounts = new Map<string, number>()
  const toUniqueId = (label: string) => {
    const baseSlug = toSlug(label) || 'section'
    const currentCount = slugCounts.get(baseSlug) ?? 0
    const nextCount = currentCount + 1
    slugCounts.set(baseSlug, nextCount)
    return nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`
  }

  const lines = markdown.split('\n')
  return lines.flatMap((line) => {
    const match = /^(##|###)\s+(.+)$/.exec(line.trim())
    if (!match) {
      return []
    }
    const level = match[1] === '##' ? 2 : 3
    const label = match[2].trim()
    return [{ id: toUniqueId(label), label, level }]
  })
}

export function DocsView() {
  const { locale, t } = useI18n()
  const docsVersion = `v${import.meta.env.VITE_UI_VERSION ?? '0.1.0'}`
  const docDefinitions = DOC_ARTICLES[locale] ?? DOC_ARTICLES.en
  const labels = {
    sidebarEyebrow: t('docs.view.sidebarEyebrow'),
    sidebarTitle: t('docs.view.sidebarTitle'),
    navAria: t('docs.view.navAria'),
    breadcrumb: t('docs.view.breadcrumb'),
    breadcrumbGuide: t('docs.view.breadcrumbGuide'),
    onThisPage: t('docs.view.onThisPage'),
    noSections: t('docs.view.noSections'),
    tocAria: t('docs.view.tocAria'),
  }
  const articles = useMemo<DocArticle[]>(
    () =>
      docDefinitions.map((article) => ({
        ...article,
        title: t(`docs.article.${article.id}.title`),
        subtitle: t(`docs.article.${article.id}.subtitle`),
      })),
    [docDefinitions, t],
  )
  const [query, setQuery] = useState('')
  const [selectedArticleId, setSelectedArticleId] = useState(articles[0]?.id ?? '')
  const deferredQuery = useDeferredValue(query)

  const filteredArticles = useMemo(() => {
    const trimmedQuery = deferredQuery.trim()
    const scored = articles.map((article, index) => ({
      article,
      score: scoreArticle(article, trimmedQuery),
      index,
    }))

    return scored
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        const scoreDiff = b.score - a.score
        if (scoreDiff !== 0) {
          return scoreDiff
        }
        return a.index - b.index
      })
      .map((entry) => entry.article)
  }, [articles, deferredQuery])

  const selectedArticleIdInFiltered = filteredArticles.some((article) => article.id === selectedArticleId)
  const effectiveSelectedArticleId = selectedArticleIdInFiltered ? selectedArticleId : (filteredArticles[0]?.id ?? '')

  const selectedArticle = useMemo(
    () =>
      filteredArticles.find((article) => article.id === effectiveSelectedArticleId) ??
      filteredArticles[0] ??
      null,
    [effectiveSelectedArticleId, filteredArticles],
  )
  const selectedHeadings = useMemo(
    () => (selectedArticle ? collectHeadings(selectedArticle.markdown) : []),
    [selectedArticle],
  )
  const headingIdQueues = (() => {
    const queues = new Map<string, string[]>()
    selectedHeadings.forEach((heading) => {
      const key = `${heading.level}:${heading.label}`
      const existing = queues.get(key)
      if (existing) {
        existing.push(heading.id)
        return
      }
      queues.set(key, [heading.id])
    })
    return queues
  })()
  const consumeHeadingId = (level: 2 | 3, label: string) => {
    const key = `${level}:${label}`
    const queue = headingIdQueues.get(key)
    if (queue && queue.length > 0) {
      return queue.shift() ?? (toSlug(label) || 'section')
    }
    return toSlug(label) || 'section'
  }
  const isGettingStartedArticle = selectedArticle?.id === 'getting-started'

  return (
    <div className="docs-view">
      <aside className="docs-sidebar">
        <header className="docs-sidebar-header">
          <p className="docs-sidebar-eyebrow">{labels.sidebarEyebrow}</p>
          <h3>{labels.sidebarTitle}</h3>
          <p className="docs-sidebar-version">{docsVersion}</p>
        </header>

        <input
          className="docs-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('docs.searchPlaceholder')}
          aria-label={t('docs.searchPlaceholder')}
        />

        {filteredArticles.length === 0 ? (
          <p className="docs-empty">{t('docs.searchNoResults', { query: deferredQuery })}</p>
        ) : (
          <nav className="docs-list" aria-label={labels.navAria}>
            {filteredArticles.map((article) => (
              <button
                key={article.id}
                type="button"
                className={`docs-list-item ${article.id === selectedArticle?.id ? 'active' : ''}`}
                aria-current={article.id === selectedArticle?.id ? 'page' : undefined}
                onClick={() => setSelectedArticleId(article.id)}
              >
                <span className="docs-list-item-title">{article.title}</span>
                <span className="docs-list-item-meta">
                  {t('docs.readingTime', { minutes: estimateReadTime(article.markdown) })}
                </span>
              </button>
            ))}
          </nav>
        )}
      </aside>

      <article className="docs-article">
        {selectedArticle ? (
          <>
            <header className="docs-article-header">
              <p className="docs-article-breadcrumb">
                {labels.breadcrumb} <span>/</span> {labels.breadcrumbGuide} <span>/</span> {selectedArticle.title}
              </p>
              <h1>{selectedArticle.title}</h1>
              <p className="docs-article-meta">
                {t('docs.readingTime', { minutes: estimateReadTime(selectedArticle.markdown) })}
              </p>
              <p className="docs-article-subtitle">{selectedArticle.subtitle}</p>
            </header>
            {isGettingStartedArticle ? (
              <div className="docs-start-brand" aria-hidden="true">
                <div className="docs-start-brand-glow" />
                <div className="docs-start-brand-badge">
                  <img className="docs-start-brand-logo" src="/logo_down.svg" alt="" />
                </div>
              </div>
            ) : null}
            <div className="docs-markdown prose max-w-none">
              <SafeMarkdown
                markdown={selectedArticle.markdown}
                onDocLinkClick={setSelectedArticleId}
                resolveHeadingId={consumeHeadingId}
              />
            </div>
          </>
        ) : (
          <p className="docs-empty">{t('docs.searchNoResults', { query: deferredQuery })}</p>
        )}
      </article>

      <aside className="docs-toc">
        <h4>{labels.onThisPage}</h4>
        {selectedHeadings.length === 0 ? (
          <p className="docs-empty">{labels.noSections}</p>
        ) : (
          <nav className="docs-toc-list" aria-label={labels.tocAria}>
            {selectedHeadings.map((heading) => (
              <a
                key={`${heading.id}-${heading.level}`}
                className={`docs-toc-item level-${heading.level}`}
                href={`#${heading.id}`}
              >
                {heading.label}
              </a>
            ))}
          </nav>
        )}
      </aside>
    </div>
  )
}
