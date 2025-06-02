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
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import lombok.experimental.UtilityClass;

import java.util.*;

import static io.devset.ce.flows.ui.dialogs.SenderDialogUtils.*;

@UtilityClass
public class LooperDialog {

    public static Optional<RuleDto> showdDialog(RuleDto ruleDto, String schemaTitle, List<FieldRuleDto> defaults, ProviderMetaData providerMetadata) {
        Dialog<RuleDto> dialog = createDialog(schemaTitle, "Looper");

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


    private static TableView<FieldRuleDto> createFieldsTableView(ObservableList<FieldRuleDto> selectedFields) {
        TableView<FieldRuleDto> table = new TableView<>();
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
        table.setPrefWidth(550);
        table.setEditable(true);

        TableColumn<FieldRuleDto, String> fieldNameCol = createFieldNameColumn();
        TableColumn<FieldRuleDto, String> typeCol = createTypeColumn();
        TableColumn<FieldRuleDto, String> defaultCel = createDefaultNameColumn("Default");
        TableColumn<FieldRuleDto, Integer> incrementCol = createNumericColumn("Increment",
                FieldRuleDto::getIncrement, FieldRuleDto::setIncrement);
        TableColumn<FieldRuleDto, Integer> repetitionCol = createNumericColumn("Repetitions",
                FieldRuleDto::getRepetitions, FieldRuleDto::setRepetitions);
        TableColumn<FieldRuleDto, Void> removeCol = createRemoveColumn(selectedFields);

        table.getColumns().addAll(fieldNameCol, typeCol, defaultCel, incrementCol, repetitionCol, removeCol);
        return table;
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


}