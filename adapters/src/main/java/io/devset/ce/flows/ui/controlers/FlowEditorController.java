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

package io.devset.ce.flows.ui.controlers;

import io.devset.ce.flows.FlowElement;
import io.devset.ce.flows.FlowsFacade;
import io.devset.ce.flows.dto.FlowDto;
import io.devset.ce.flows.providers.KafkaMataData;
import io.devset.ce.flows.ui.controlers.utils.FlowElementFactory;
import io.devset.ce.kafka.KafkaFacade;
import io.devset.ce.kafka.dto.KafkaTopicDto;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.input.*;
import javafx.scene.layout.Pane;
import javafx.scene.layout.VBox;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@Slf4j
@RequiredArgsConstructor
public class FlowEditorController {

    private final KafkaFacade kafkaFacade;
    private final FlowsFacade flowsFacade;

    @FXML
    private Pane canvasPane;
    @FXML
    private ComboBox<FlowDto> templateSelector;
    @FXML
    private ComboBox<String> topicSelector;
    @FXML
    private TextField flowNameField;
    @FXML
    private VBox logPanel;
    @FXML
    private TextArea logArea;

    private FlowSceneService service;

    @FXML
    void initialize() {
        var availableSchemas = kafkaFacade.findSchemas();
        var availableTopics = kafkaFacade.getAllTopics().stream().map(KafkaTopicDto::getName).toList();

        this.service = new FlowSceneService(canvasPane, availableSchemas, availableTopics, flowsFacade);
        service.initNewScene();
        service.loadTemplateList(templateSelector);
        service.loadTopics(topicSelector);
        flowNameField.setText(service.getState().getName());
        if (service.getState().getProviderMetadata() instanceof KafkaMataData kafka && kafka.getTopic() != null && !kafka.getTopic().isBlank()) {
            topicSelector.getSelectionModel().select(kafka.getTopic());
        }
        service.initLogger(logArea);
    }


    public void toggleLogPanel() {
        boolean visible = logPanel.isVisible();
        logPanel.setVisible(!visible);
        logPanel.setManaged(!visible); // hidden in layout
    }

    public void hideLogPanel() {
        logPanel.setVisible(false);
        logPanel.setManaged(false);
    }


    @FXML
    public void onCreateNewFlow() {
        service.setState(flowsFacade.createFlow());
        service.initNewScene();
    }

    @FXML
    void onTemplateSelected() {
        FlowDto selected = templateSelector.getSelectionModel().getSelectedItem();
        if (selected == null) return;

        String selectedId = selected.getId();
        log.info("Selected flow ID: {}", selectedId);
        flowNameField.setText(selected.getName());
        service.dispose();
        service.setState(flowsFacade.getById(selectedId));
        service.initNewScene();
    }

    @FXML
    void onPlay() {
        flowsFacade.startFlows(service.getState());
        log.info("Flows started");
    }

    @FXML
    void onStop() {
        flowsFacade.stopFlows();
    }

    @FXML
    void onDragSchema(MouseEvent event) {
        Dragboard db = ((Label) event.getSource()).startDragAndDrop(TransferMode.COPY);
        ClipboardContent content = new ClipboardContent();
        content.putString(FlowElement.SCHEMA.toString());
        db.setContent(content);
        event.consume();
    }

    @FXML
    void onDragLoopSender(MouseEvent event) {
        Dragboard db = ((Label) event.getSource()).startDragAndDrop(TransferMode.COPY);
        ClipboardContent content = new ClipboardContent();
        content.putString(FlowElement.LOOP_SENDER.toString());
        db.setContent(content);
        event.consume();
    }

    @FXML
    void onDragSingleSender(MouseEvent event) {
        Dragboard db = ((Label) event.getSource()).startDragAndDrop(TransferMode.COPY);
        ClipboardContent content = new ClipboardContent();
        content.putString(FlowElement.SINGLE_SENDER.toString());
        db.setContent(content);
        event.consume();
    }

    @FXML
    void onDragOver(DragEvent event) {
        if (event.getGestureSource() != canvasPane && event.getDragboard().hasString()) {
            event.acceptTransferModes(TransferMode.COPY_OR_MOVE);
        }
        event.consume();
    }

    @FXML
    void saveFlow() {
        this.service.getState().setName(flowNameField.getText());
        service.saveFlows();
    }

    @FXML
    void onDrop(DragEvent event) {
        Dragboard db = event.getDragboard();
        boolean success = false;

        if (db.hasString()) {
            String type = db.getString();
            Label node = FlowElementFactory.create(UUID.randomUUID().toString(), FlowElement.valueOf(type), event.getX(), event.getY());
            service.enableNodeActions(node);
            service.addNewNode(node, event.getX(), event.getY());
            success = true;
        }

        event.setDropCompleted(success);
        event.consume();
    }

    @FXML
    void onDeleteFlow() {
        this.service.deleteFlows();
        this.service.loadTemplateList(templateSelector);
    }

    @FXML
    void onTopicSelected() {
        String selected = topicSelector.getSelectionModel().getSelectedItem();
        if (selected == null) return;
        if (service.getState().getProviderMetadata() instanceof KafkaMataData kafka) {
            kafka.setTopic(selected);
        }

    }

}