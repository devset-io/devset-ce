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

package io.devset.ce.flows.jpa.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "field_rule")
@Getter
@Setter
@NoArgsConstructor
public class FieldRuleEntity {

    @Id
    private String id;

    @Column(name = "field_name", nullable = false)
    private String fieldName;

    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "default_value", nullable = false)
    private String defaultValue;

    @Column(name = "increment")
    private Integer increment;

    @Column(name = "repetitions")
    private Integer repetitions;

    @Column(name = "flow_rule_id")
    private String flowRuleId;
}
