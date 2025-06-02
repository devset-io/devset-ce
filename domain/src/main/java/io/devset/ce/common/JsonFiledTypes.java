/*
 * This file is part of Devset CE.
 *
 * Copyright (C) "2025" Dominik Martyniak
 *
 * Devset CE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Devset CE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Devset CE. If not, see <https://www.gnu.org/licenses/>.
 */

package io.devset.ce.common;

import lombok.experimental.UtilityClass;

@UtilityClass
public class JsonFiledTypes {

    public static final String TYPE_OBJECT = "object";
    public static final String TYPE_INTEGER = "integer";
    public static final String TYPE_NUMBER = "number";
    public static final String TYPE_BOOLEAN = "boolean";
    public static final String TYPE_STRING = "string";
    public static final String TYPE_PROPERTY = "type";
    public static final String DEFAULT_PROPERTY = "default";
    public static final String PROPERTIES_PROPERTY = "properties";
    public static final String UNSUPPORTED_TYPE_VALUE = "unsupported_type";
    public static final String EMPTY_STRING = "";
}
