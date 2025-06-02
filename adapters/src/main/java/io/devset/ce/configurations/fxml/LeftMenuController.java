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

package io.devset.ce.configurations.fxml;

import io.devset.ce.flows.FlowViews;
import io.devset.ce.kafka.ui.KafkaViews;
import io.devset.ce.rabbitmq.RabbitViews;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class LeftMenuController {

    private final ViewManager viewManager;

    @FXML
    public void handleClick(javafx.scene.input.MouseEvent event) {
        var clickedLabel = (Label) event.getSource();
        var id = clickedLabel.getId();
        handleSwitch(id);
    }

    void handleSwitch(String labelId) {
        switch (labelId) {
            //KAFKA
            case "kafkaPaneConfig" -> viewManager.switchContent(KafkaViews.KAFKA_MAIN.getPath());
            case "kafkaPaneSchema" -> viewManager.switchContent(KafkaViews.KAFKA_SCHEMA.getPath());
            case "kafkaPaneTopics" -> viewManager.switchContent(KafkaViews.KAFKA_TOPICS.getPath());

            //RABBITMQ
            case "rabbitPaneConfig" -> viewManager.switchContent(RabbitViews.RABBITMQ_MAIN.getPath());
            case "rabbitPaneSchema" -> viewManager.switchContent(RabbitViews.RABBITMQ_MAIN.getPath());
            case "rabbitPaneTopics" -> viewManager.switchContent(RabbitViews.RABBITMQ_MAIN.getPath());

            //flow
            case "editorPaneConfig" -> viewManager.switchContent(FlowViews.FLOW_EDITOR_MAIN.getPath());
            case "editorPaneSchema" -> viewManager.switchContent(FlowViews.FLOW_EDITOR_MAIN.getPath());
            case "editorPaneTopics" -> viewManager.switchContent(FlowViews.FLOW_EDITOR_MAIN.getPath());
            default -> log.warn("Cant find id {}", labelId);
        }
    }
}

