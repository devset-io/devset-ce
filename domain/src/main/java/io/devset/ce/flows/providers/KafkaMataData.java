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

package io.devset.ce.flows.providers;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.devset.ce.common.ProviderMetaData;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Setter
@Getter
public class KafkaMataData extends ProviderMetaData {

    private String topic;
    private Map<String, Map<String, String>> headers; //ruleId , headers

    @JsonCreator
    public KafkaMataData(@JsonProperty("topic") String topic, @JsonProperty("headers") Map<String, Map<String, String>> headers) {
        this.topic = topic;
        this.headers = headers;
    }

    public void setHeaders(String nodeId, Map<String, String> headers) {
        this.headers.put(nodeId, headers);
    }

    public Map<String, String> getHeaders(String nodeId) {
        return headers.getOrDefault(nodeId,Map.of());
    }
}