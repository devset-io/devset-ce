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

package io.devset.ce.flows.ui.dialogs;

import io.devset.ce.common.FieldRuleDto;
import io.devset.ce.common.ProviderMetaData;
import io.devset.ce.common.RuleDto;
import io.devset.ce.flows.providers.KafkaMataData;
import io.devset.ce.flows.ui.dialogs.kafka.KafkaHeadersDialog;
import javafx.beans.property.ReadOnlyStringWrapper;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.control.cell.TextFieldTableCell;
import javafx.scene.layout.*;
import javafx.util.converter.DefaultStringConverter;

import java.util.*;
import java.util.stream.Collectors;

import static io.devset.ce.common.JsonFiledTypes.TYPE_INTEGER;

public class SchemaDialogSplitView {

    private SchemaDialogSplitView() {
        throw new IllegalStateException("Utility class");
    }

    public static Optional<RuleDto> showSchemaDialog(RuleDto ruleDto, String schemaTitle, List<FieldRuleDto> defaults, ProviderMetaData providerMetadata) {
        Dialog<RuleDto> dialog = createDialog(schemaTitle);

        ObservableList<FieldRuleDto> allFields = FXCollections.observableArrayList(defaults);
        ObservableList<FieldRuleDto> selectedFields = FXCollections.observableArrayList(ruleDto.getRules());

        TreeView<String> fieldTreeView = createFieldTreeView(allFields, selectedFields);
        TableView<FieldRuleDto> table = createFieldsTableView(selectedFields);

        TextField tickField = new TextField(String.valueOf(ruleDto.getGlobalTickMillis()));
        HBox tickBox = createTickIntervalBox(ruleDto.getId(), tickField, providerMetadata);

        VBox container = createMainLayout(fieldTreeView, table, tickBox);
        dialog.getDialogPane().setContent(container);

        setupDialogButtons(dialog, ruleDto, selectedFields, tickField);

        table.setItems(selectedFields);
        return dialog.showAndWait();
    }

    private static Dialog<RuleDto> createDialog(String schemaTitle) {
        Dialog<RuleDto> dialog = new Dialog<>();
        dialog.getDialogPane().setPrefWidth(800);
        dialog.getDialogPane().setPrefHeight(600);
        dialog.setTitle("Configure Fields");
        dialog.setHeaderText("Schema: " + schemaTitle);
        return dialog;
    }

    private static TreeView<String> createFieldTreeView(ObservableList<FieldRuleDto> allFields,
                                                        ObservableList<FieldRuleDto> selectedFields) {
        TreeView<String> fieldTreeView = new TreeView<>();
        fieldTreeView.setPrefWidth(200);

        TreeItem<String> root = new TreeItem<>();
        root.setExpanded(true);

        Map<String, TreeItem<String>> nodeMap = new HashMap<>();
        buildFieldTreeStructure(allFields, root, nodeMap);

        fieldTreeView.setRoot(root);
        fieldTreeView.setShowRoot(false);

        fieldTreeView.setOnMouseClicked(event -> handleFieldSelection(
                fieldTreeView, allFields, selectedFields));

        return fieldTreeView;
    }

    private static void handleFieldSelection(TreeView<String> fieldTreeView,
                                             ObservableList<FieldRuleDto> allFields,
                                             ObservableList<FieldRuleDto> selectedFields) {
        TreeItem<String> selected = fieldTreeView.getSelectionModel().getSelectedItem();
        if (selected != null && selected.isLeaf()) {
            String fullPath = buildFullPath(selected);
            allFields.stream()
                    .filter(dto -> dto.getFieldName().equals(fullPath))
                    .findFirst()
                    .ifPresent(dto -> {
                        if (!selectedFields.stream().map(FieldRuleDto::getFieldName).collect(Collectors.toSet()).contains(dto.getFieldName())) {
                            selectedFields.add(dto);
                        }
                    });
        }
    }

    private static TableView<FieldRuleDto> createFieldsTableView(ObservableList<FieldRuleDto> selectedFields) {
        TableView<FieldRuleDto> table = new TableView<>();
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
        table.setPrefWidth(550);
        table.setEditable(true);

        TableColumn<FieldRuleDto, String> fieldNameCol = createFieldNameColumn();
        TableColumn<FieldRuleDto, String> typeCol = createTypeColumn();
        TableColumn<FieldRuleDto, String> defaultCel = createDefaultNameColumn();
        TableColumn<FieldRuleDto, Integer> incrementCol = createNumericColumn("Increment",
                FieldRuleDto::getIncrement, FieldRuleDto::setIncrement);
        TableColumn<FieldRuleDto, Integer> repetitionCol = createNumericColumn("Repetitions",
                FieldRuleDto::getRepetitions, FieldRuleDto::setRepetitions);
        TableColumn<FieldRuleDto, Void> removeCol = createRemoveColumn(selectedFields);

        table.getColumns().addAll(fieldNameCol, typeCol, defaultCel, incrementCol, repetitionCol, removeCol);
        return table;
    }

    private static TableColumn<FieldRuleDto, String> createFieldNameColumn() {
        TableColumn<FieldRuleDto, String> column = new TableColumn<>("Field");
        column.setCellValueFactory(data -> new ReadOnlyStringWrapper(data.getValue().getFieldName()));
        column.setPrefWidth(100);
        column.setMinWidth(80);
        return column;
    }

    private static TableColumn<FieldRuleDto, String> createDefaultNameColumn() {
        TableColumn<FieldRuleDto, String> column = new TableColumn<>("Default");
        column.setCellValueFactory(data -> new ReadOnlyStringWrapper(data.getValue().getDefaultValue()));
        column.setCellFactory(TextFieldTableCell.forTableColumn(new DefaultStringConverter()));
        column.setOnEditCommit(event -> {
            FieldRuleDto dto = event.getRowValue();
            dto.setDefaultValue(event.getNewValue());
        });
        column.setPrefWidth(100);
        column.setMinWidth(80);
        column.setEditable(true);
        return column;
    }


    private static TableColumn<FieldRuleDto, String> createTypeColumn() {
        TableColumn<FieldRuleDto, String> column = new TableColumn<>("Type");
        column.setCellValueFactory(data -> new ReadOnlyStringWrapper(data.getValue().getType()));
        column.setPrefWidth(60);
        column.setMinWidth(50);
        return column;
    }

    private static TableColumn<FieldRuleDto, Integer> createNumericColumn(String title,
                                                                          java.util.function.Function<FieldRuleDto, Integer> getter,
                                                                          BiConsumer<FieldRuleDto, Integer> setter) {
        TableColumn<FieldRuleDto, Integer> column = new TableColumn<>(title);
        column.setCellFactory(col -> createSpinnerCell(getter, setter));
        column.setPrefWidth(60);
        column.setMinWidth(50);
        return column;
    }

    private static TableColumn<FieldRuleDto, Void> createRemoveColumn(ObservableList<FieldRuleDto> selectedFields) {
        TableColumn<FieldRuleDto, Void> column = new TableColumn<>("");
        column.setCellFactory(col -> new TableCell<>() {
            final Button btn = new Button("✕");

            {
                btn.setOnAction(e -> selectedFields.remove(getTableView().getItems().get(getIndex())));
            }

            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                setGraphic(empty ? null : btn);
            }
        });
        column.setPrefWidth(30);
        column.setMinWidth(30);
        return column;
    }

    private static HBox createTickIntervalBox(String ruleId, TextField tickField, ProviderMetaData providerMetaData) {
        HBox tickBox = new HBox(10);
        tickBox.setPadding(new Insets(0, 0, 0, 10));

        Label tickLabel = new Label("Global Tick Interval (ms):");
        Button headersButton = new Button("Kafka Headers");

        if (providerMetaData instanceof KafkaMataData kafkaMataData)
            headersButton.setOnAction(e -> {
                var existingHeaders = new HashMap<String, String>();
                if (kafkaMataData.getHeaders() != null) {
                    existingHeaders.putAll(kafkaMataData.getHeaders(ruleId));
                }

                KafkaHeadersDialog.show(existingHeaders).ifPresent(el -> {
                    kafkaMataData.setHeaders(ruleId, el);
                });
            });

        tickBox.getChildren().addAll(tickLabel, tickField, headersButton);
        return tickBox;
    }

    private static VBox createMainLayout(TreeView<String> fieldTreeView,
                                         TableView<FieldRuleDto> table,
                                         HBox tickBox) {
        HBox layout = new HBox(20);
        layout.setPadding(new Insets(10));
        layout.getChildren().addAll(fieldTreeView, table);

        VBox container = new VBox(10,
                new Label("Fields Configuration:"),
                layout,
                tickBox
        );
        container.setPadding(new Insets(10));
        return container;
    }

    private static void setupDialogButtons(Dialog<RuleDto> dialog,
                                           RuleDto ruleDto,
                                           ObservableList<FieldRuleDto> selectedFields,
                                           TextField tickField) {
        ButtonType saveButton = new ButtonType("Save", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(saveButton, ButtonType.CANCEL);

        dialog.setResultConverter(button -> {
            if (button == saveButton) {
                return saveRuleConfiguration(ruleDto, selectedFields, tickField);
            }
            return null;
        });
    }

    private static RuleDto saveRuleConfiguration(RuleDto ruleDto,
                                                 ObservableList<FieldRuleDto> selectedFields,
                                                 TextField tickField) {
        selectedFields.forEach(el -> el.setSelected(true));
        ruleDto.setRules(selectedFields);
        try {
            ruleDto.setGlobalTickMillis(Integer.parseInt(tickField.getText()));
        } catch (NumberFormatException ignored) {

        }
        return ruleDto;
    }

    private static String buildFullPath(TreeItem<String> item) {
        List<String> parts = new ArrayList<>();
        while (item != null && item.getParent() != null) {
            parts.add(item.getValue());
            item = item.getParent();
        }
        Collections.reverse(parts);
        return String.join(".", parts);
    }

    private static TableCell<FieldRuleDto, Integer> createSpinnerCell(
            java.util.function.Function<FieldRuleDto, Integer> getter,
            BiConsumer<FieldRuleDto, Integer> setter
    ) {
        return new TableCell<>() {
            private final Spinner<Integer> spinner = new Spinner<>(-1_000_000, 1_000_000, 0, 1);
            private final SpinnerValueFactory.IntegerSpinnerValueFactory factory =
                    new SpinnerValueFactory.IntegerSpinnerValueFactory(-1_000_000, 1_000_000);

            {
                spinner.setValueFactory(factory);
                spinner.setEditable(true);
                spinner.valueProperty().addListener((obs, old, val) -> {
                    FieldRuleDto rule = getTableView().getItems().get(getIndex());
                    setter.accept(rule, val);
                });
            }

            @Override
            protected void updateItem(Integer item, boolean empty) {
                super.updateItem(item, empty);
                if (empty) {
                    setGraphic(null);
                } else {
                    FieldRuleDto rule = getTableView().getItems().get(getIndex());
                    if (!TYPE_INTEGER.equalsIgnoreCase(rule.getType())) {
                        setGraphic(null); //
                    } else {
                        factory.setValue(getter.apply(rule));
                        setGraphic(spinner);
                    }
                }
            }
        };
    }

    private static void buildFieldTreeStructure(List<FieldRuleDto> allFields, TreeItem<String> root, Map<String, TreeItem<String>> nodeMap) {
        for (FieldRuleDto dto : allFields) {
            String[] parts = dto.getFieldName().split("\\.");

            if (parts.length == 1) {
                TreeItem<String> item = new TreeItem<>(parts[0]);
                root.getChildren().add(item);
                nodeMap.put(parts[0], item);
                continue;
            }

            TreeItem<String> current = root;
            StringBuilder path = new StringBuilder();

            for (int i = 0; i < parts.length; i++) {
                path.append(parts[i]);
                String key = path.toString();

                nodeMap.putIfAbsent(key, new TreeItem<>(parts[i]));
                if (!current.getChildren().contains(nodeMap.get(key))) {
                    current.getChildren().add(nodeMap.get(key));
                }
                current = nodeMap.get(key);
                path.append(".");
            }
        }
    }


    @FunctionalInterface
    public interface BiConsumer<T, U> {
        void accept(T t, U u);
    }
}