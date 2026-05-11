/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.infrastructure;

import java.util.regex.Pattern;

/**
 * Strips credentials from MongoDB connection URIs before they are returned
 * over the API or written to logs.
 */
public final class MongoUriSanitizer {

    private static final Pattern EMBEDDED_URI_AUTH =
            Pattern.compile("(mongodb(?:\\+srv)?://)[^/\\s@]*@");

    private MongoUriSanitizer() {
    }

    /**
     * Returns the URI with the {@code user:password@} userinfo removed.
     *
     * @param connectionString raw MongoDB URI
     * @return URI safe to expose externally
     */
    public static String redact(String connectionString) {
        if (connectionString == null) {
            return null;
        }
        int schemeEnd = connectionString.indexOf("://");
        if (schemeEnd < 0) {
            return connectionString;
        }
        int authorityStart = schemeEnd + 3;
        int at = connectionString.indexOf('@', authorityStart);
        int firstSlash = connectionString.indexOf('/', authorityStart);
        int firstQuestion = connectionString.indexOf('?', authorityStart);
        int authorityEnd = minPositive(firstSlash, firstQuestion, connectionString.length());
        if (at < 0 || at >= authorityEnd) {
            return connectionString;
        }
        return connectionString.substring(0, authorityStart) + connectionString.substring(at + 1);
    }

    /**
     * Removes any embedded MongoDB URI credentials from arbitrary text such as
     * driver exception messages.
     *
     * @param text text that may contain MongoDB URIs with userinfo
     * @return text with {@code user:password@} stripped from each embedded URI
     */
    public static String redactInText(String text) {
        if (text == null) {
            return null;
        }
        return EMBEDDED_URI_AUTH.matcher(text).replaceAll("$1");
    }

    private static int minPositive(int a, int b, int fallback) {
        int m = fallback;
        if (a >= 0 && a < m) m = a;
        if (b >= 0 && b < m) m = b;
        return m;
    }
}
