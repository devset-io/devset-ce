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

package io.devset.ce.flows.ui.controlers.utils;

import com.fasterxml.jackson.databind.JsonNode;
import io.devset.ce.common.FieldRuleDto;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;


import static io.devset.ce.common.JsonFiledTypes.*;

@UtilityClass
public class SchemaParser {

    public static List<FieldRuleDto> extractFields(JsonNode schemaNode) {
        List<FieldRuleDto> result = new ArrayList<>();
        JsonNode properties = schemaNode.get(PROPERTIES_PROPERTY);

        if (properties != null && properties.isObject()) {
            extractFieldsRecursive(properties, "", result);
        }

        return result;
    }

    private static void extractFieldsRecursive(JsonNode propertiesNode, String prefix, List<FieldRuleDto> result) {
        propertiesNode.fields().forEachRemaining(entry -> {
            String fieldName = entry.getKey();
            JsonNode fieldSchema = entry.getValue();

            String fullName = prefix.isEmpty() ? fieldName : prefix + "." + fieldName;

            boolean isNested = fieldSchema.has(TYPE_PROPERTY)
                    && "object".equals(fieldSchema.get(TYPE_PROPERTY).asText())
                    && fieldSchema.has(PROPERTIES_PROPERTY);

            if (isNested) {
                extractFieldsRecursive(fieldSchema.get(PROPERTIES_PROPERTY), fullName, result);
            } else {
                String type = fieldSchema.has(TYPE_PROPERTY) ? fieldSchema.get(TYPE_PROPERTY).asText() : "";
                boolean isnumber = type.equals(TYPE_NUMBER) || type.equals(TYPE_INTEGER);
                String defaultValue = fieldSchema.has(DEFAULT_PROPERTY ) ? fieldSchema.get(DEFAULT_PROPERTY ).asText() :
                        isnumber ? "0" : null;
                result.add(new FieldRuleDto(fullName, type, defaultValue, 0));
            }
        });
    }
}
