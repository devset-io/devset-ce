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
 * along with Devset CE. If not, see <http4s://www.gnu.org/licenses/>.
 */

package io.devset.ce.flows.ui.controlers;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.common.FieldRuleDto;
import io.devset.ce.common.RuleDto;
import io.devset.ce.flows.FlowElement;
import io.devset.ce.flows.FlowsFacade;
import io.devset.ce.flows.dto.FlowDefinitionDto;
import io.devset.ce.flows.dto.FlowDto;
import io.devset.ce.flows.dto.FlowNodeDto;
import io.devset.ce.flows.services.UiLogAppender;
import io.devset.ce.flows.ui.controlers.utils.FlowElementFactory;
import io.devset.ce.flows.ui.controlers.utils.SchemaParser;
import io.devset.ce.flows.ui.dialogs.LooperDialog;
import io.devset.ce.flows.ui.dialogs.SingleSenderDialog;
import io.devset.ce.schemas.dto.SchemaDto;
import javafx.application.Platform;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.TextArea;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.Pane;
import lombok.Getter;

import lombok.Setter;
import lombok.SneakyThrows;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.LoggerFactory;


import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

import static io.devset.ce.flows.ui.dialogs.AssigmentDialog.showAssigmentDialog;
import static io.devset.ce.flows.ui.dialogs.SchemaPayloadDialog.showSchemaPayloadDialog;
import static io.devset.ce.flows.ui.controlers.utils.Addons.connectNodesWithArrow;

@Slf4j
class FlowSceneService {

    @Getter
    @Setter
    private FlowDefinitionDto state;
    @Getter
    private final List<FlowDto> availableFlows;
    @Getter
    private final List<String> availableTopics;
    private final List<SchemaDto> availableSchemas;
    private final List<Label> labels = new ArrayList<>();
    private final Pane canvasPane;
    private FlowNodeDto selectedNode;
    private final FlowsFacade flowsFacade;

    FlowSceneService(Pane canvasPane, List<SchemaDto> availableSchemas, List<String> availableTopics, FlowsFacade flowsFacade) {
        this.canvasPane = canvasPane;
        this.availableSchemas = availableSchemas;
        this.availableFlows = flowsFacade.getNames();
        var firstFlow = availableFlows.stream().findFirst();
        this.state = firstFlow.isEmpty() ? flowsFacade.createFlow() : flowsFacade.getById(firstFlow.get().getId());
        this.availableTopics = availableTopics;
        this.flowsFacade = flowsFacade;
    }

    void refreshAvailableFlows(List<FlowDto> availableFlows) {
        this.availableFlows.clear();
        this.availableFlows.addAll(availableFlows);
    }

    void initLogger(TextArea logArea) {
        UiLogAppender.setLogConsumer(msg ->
                Platform.runLater(() -> {
                    String formatted = String.format("[%1$tT] %2$s", new Date(), msg);
                    logArea.appendText(formatted + "\n");
                })
        );

        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        Logger rootLogger = context.getLogger("ROOT");

        boolean alreadyAdded = false;
        for (Iterator<Appender<ILoggingEvent>> it = rootLogger.iteratorForAppenders(); it.hasNext(); ) {
            Appender<?> appender = it.next();
            if (appender instanceof UiLogAppender) {
                alreadyAdded = true;
                break;
            }
        }

        if (!alreadyAdded) {
            UiLogAppender uiAppender = new UiLogAppender();
            uiAppender.setContext(context);
            uiAppender.start();
            rootLogger.addAppender(uiAppender);
        }
    }

    void initNewScene() {
        dispose();

        this.state.getNodes().forEach(node -> {
            var newLabel = FlowElementFactory.create(node.getId(), node.getType(), node.getPositionX(), node.getPositionY());
            enableNodeActions(newLabel);
        });

        Platform.runLater(() ->
                this.state.getConnections().forEach(connection ->
                        connectNodesWithArrow(canvasPane, getLabel(connection.getSourceId()), getLabel(connection.getTargetId()), 40)
                )
        );
    }

    void dispose() {
        if (canvasPane != null) {
            canvasPane.getChildren().clear();
        }

        selectedNode = null;
        labels.clear();

        log.info("FlowEditorController disposed and fully cleared.");
    }

    void loadTemplateList(ComboBox<FlowDto> templateSelector) {

        templateSelector.getItems().clear();
        templateSelector.getItems().addAll(getAvailableFlows());

        templateSelector.setCellFactory(listView -> new ListCell<>() {
            @Override
            protected void updateItem(FlowDto item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty || item == null ? null : item.getName());
            }
        });

        templateSelector.setButtonCell(new ListCell<>() {
            @Override
            protected void updateItem(FlowDto item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty || item == null ? null : item.getName());
            }
        });

        if (!getAvailableFlows().isEmpty()) {
            templateSelector.getSelectionModel().selectFirst();
        }
    }

    void enableNodeActions(Label node) {
        node.setOnMouseClicked(e -> handleMouseActionOnNode(e, node));
        enableDrag(node);
        canvasPane.getChildren().add(node);
        labels.add(node);
    }

    void addNewNode(Label node, double x, double y) {
        getState().addNode(new FlowNodeDto(
                node.getId(),
                node.getText(),
                x, y,
                FlowElement.valueOf(node.getUserData().toString()),
                null
        ));
    }

    private Optional<SchemaDto> getSchemaDto(String schemaId) {
        return availableSchemas.stream().filter(availableSchema -> availableSchema.getId().equals(schemaId)).findFirst();
    }

    private Label getLabel(String id) {
        return labels.stream().filter(availableSchema -> availableSchema.getId().equals(id)).findFirst().orElseThrow();
    }

    private void handleMouseActionOnNode(MouseEvent e, Label node) {
        var nodeDto = state.findNode(node.getId()).orElseThrow();
        if (e.getButton().name().equals("SECONDARY")) {
            handleSecondaryButton(nodeDto);
        } else {
            handleCreateConnection(nodeDto);
        }
        e.consume();
    }

    private void handleSecondaryButton(FlowNodeDto node) {
        if (node.getType().equals(FlowElement.SCHEMA)) {
            showSchemaFieldsWindow(node);
        } else {
            showActionFieldsWindow(node);
        }
    }

    private void showSchemaFieldsWindow(FlowNodeDto node) {
        if (state.hasConnection(node.getId())) {
            var schema = getSchemaDto(node.getSchemaId()).orElseThrow();
            showSchemaPayloadDialog(schema, node);
        } else {
            showAssigmentDialog(node, availableSchemas);
            if (node.getSchemaId() != null) {
                var schema = getSchemaDto(node.getSchemaId()).orElseThrow();
                getLabel(node.getId()).setText(schema.getName());
            }
        }
    }

    private void handleCreateConnection(FlowNodeDto node) {
        if (selectedNode == null && node.getType().equals(FlowElement.SCHEMA)) {
            selectedNode = node;
        } else {
            createConnection(node);
        }
    }

    @SneakyThrows
    private void showActionFieldsWindow(FlowNodeDto node) {
        ObjectMapper mapper = new ObjectMapper();
        var schema = availableSchemas.stream()
                .filter(it -> it.getId().equals(node.getSchemaId()));

        String json = schema
                .map(SchemaDto::getPayload)
                .findFirst()
                .orElse(null);

        if (json == null || json.isBlank()) {
            return;
        }

        JsonNode schemaNode = mapper.readTree(json);
        String schemaTitle = schemaNode.has("title") ? schemaNode.get("title").asText() : "Unnamed Schema";
        List<FieldRuleDto> fieldRule = SchemaParser.extractFields(schemaNode);
        if (fieldRule.isEmpty()) {
            return;
        }
        AtomicReference<RuleDto> rule = new AtomicReference<>(new RuleDto(UUID.randomUUID().toString(), node.getSchemaId(), node.getType(), 1000, new ArrayList<>()));
        state.getRule(node.getId()).ifPresent(rule::set);
        switch (node.getType()) {
            case LOOP_SENDER ->
                    LooperDialog.showdDialog(rule.get(), schemaTitle, SchemaParser.extractFields(schemaNode), state.getProviderMetadata())
                            .ifPresent(configured -> {
                                this.state.addRule(node.getId(), configured);
                                saveFlows();
                            });

            case SINGLE_SENDER ->
                    SingleSenderDialog.showDialog(rule.get(), schemaTitle, SchemaParser.extractFields(schemaNode), state.getProviderMetadata())
                            .ifPresent(configured -> {
                                this.state.addRule(node.getId(), configured);
                                saveFlows();
                            });

        }

    }

    private void createConnection(FlowNodeDto node) {
        if (selectedNode != null && selectedNode.getType().equals(FlowElement.SCHEMA) && node.getType().isAction()) {
            // Check if this Schema is already connected
            if (!state.hasConnection(selectedNode.getId()) && !state.isConnection(node.getId())) {
                var schemaNode = state.findNode(selectedNode.getId()).orElseThrow();
                var schemaDto = getSchemaDto(schemaNode.getSchemaId()).orElseThrow();
                var actionNode = getLabel(node.getId());
                connectNodesWithArrow(canvasPane, getLabel(selectedNode.getId()), getLabel(node.getId()), 40);
                node.setSchemaId(schemaDto.getId());
                actionNode.setText("Schema Assigned -> " + schemaDto.getName());
                state.addConnection(selectedNode.getId(), node.getId());
            } else {
                log.warn("Cant Connected");
            }
        }
        selectedNode = null;
    }

    private void enableDrag(Label node) {
        final double[] offsetX = new double[1];
        final double[] offsetY = new double[1];

        node.setOnMousePressed(e -> {
            offsetX[0] = e.getSceneX() - node.getLayoutX();
            offsetY[0] = e.getSceneY() - node.getLayoutY();
        });

        node.setOnMouseDragged(e -> {
            node.setLayoutX(e.getSceneX() - offsetX[0]);
            node.setLayoutY(e.getSceneY() - offsetY[0]);
            state.findNode(node.getId()).ifPresent(flowNode -> {
                flowNode.setPositionY(node.getLayoutY());
                flowNode.setPositionX(node.getLayoutX());
            });
        });
    }

    public void loadTopics(ComboBox<String> templateSelector) {

        templateSelector.getItems().clear();
        templateSelector.getItems().addAll(getAvailableTopics());

        templateSelector.setCellFactory(listView -> new ListCell<>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty || item == null ? null : item);
            }
        });

        templateSelector.setButtonCell(new ListCell<>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty || item == null ? null : item);
            }
        });

        if (!getAvailableFlows().isEmpty()) {
            templateSelector.getSelectionModel().selectFirst();
        }
    }

    public void saveFlows() {
        flowsFacade.saveFlow(getState());
        refreshAvailableFlows(flowsFacade.getNames());
    }

    public void deleteFlows() {
        flowsFacade.delete(getState().getId());
        refreshAvailableFlows(flowsFacade.getNames());
    }
}
