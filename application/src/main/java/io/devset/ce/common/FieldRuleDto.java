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

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.UUID;

@Getter
@Setter
@ToString
public class FieldRuleDto {
    private String id;
    private String fieldName;
    private String type;
    private String defaultValue;
    private int increment;
    private int repetitions;
    private boolean selected;

    public FieldRuleDto(String fieldName, String type, String defaultValue, int increment) {
        this.id = UUID.randomUUID().toString();
        this.fieldName = fieldName;
        this.type = type;
        this.increment = increment;
        this.defaultValue = defaultValue;

    }

}
