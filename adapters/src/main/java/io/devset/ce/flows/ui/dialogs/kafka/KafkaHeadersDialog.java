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

package io.devset.ce.flows.ui.dialogs.kafka;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class KafkaHeadersDialog {

    private KafkaHeadersDialog() {
        throw new IllegalStateException("Utility class");
    }

    public static Optional<Map<String, String>> show(Map<String, String> existingHeaders) {
        Dialog<Map<String, String>> dialog = new Dialog<>();
        dialog.setTitle("Kafka Headers");
        dialog.setHeaderText("Define Kafka Message Headers (key-value pairs)");

        ButtonType saveButtonType = new ButtonType("Save", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(saveButtonType, ButtonType.CANCEL);

        ScrollPane scrollPane = new ScrollPane();
        scrollPane.setFitToWidth(true);
        scrollPane.setPrefHeight(300);

        VBox container = new VBox(10);
        container.setPadding(new Insets(15));

        ObservableList<Map.Entry<TextField, TextField>> fields = FXCollections.observableArrayList();

        Runnable addRow = () -> {
            TextField keyField = new TextField();
            TextField valueField = new TextField();
            keyField.setPromptText("Key");
            valueField.setPromptText("Value");
            HBox.setHgrow(keyField, Priority.ALWAYS);
            HBox.setHgrow(valueField, Priority.ALWAYS);

            Button removeButton = new Button("✕");
            HBox row = new HBox(5, keyField, valueField, removeButton);

            Map.Entry<TextField, TextField> entry = Map.entry(keyField, valueField);
            fields.add(entry);
            container.getChildren().add(container.getChildren().size() - 1, row);

            removeButton.setOnAction(e -> {
                container.getChildren().remove(row);
                fields.remove(entry);
            });
        };

        if (existingHeaders != null) {
            for (Map.Entry<String, String> header : existingHeaders.entrySet()) {
                TextField keyField = new TextField(header.getKey());
                TextField valueField = new TextField(header.getValue());
                keyField.setPromptText("Key");
                valueField.setPromptText("Value");
                HBox.setHgrow(keyField, Priority.ALWAYS);
                HBox.setHgrow(valueField, Priority.ALWAYS);

                Button removeButton = new Button("✕");
                HBox row = new HBox(5, keyField, valueField, removeButton);

                Map.Entry<TextField, TextField> entry = Map.entry(keyField, valueField);
                fields.add(entry);
                container.getChildren().add(container.getChildren().size(), row);

                removeButton.setOnAction(e -> {
                    container.getChildren().remove(row);
                    fields.remove(entry);
                });
            }
        }

        Button addButton = new Button("+ Add Header");
        container.getChildren().add(addButton);
        addButton.setOnAction(e -> addRow.run());

        scrollPane.setContent(container);
        dialog.getDialogPane().setContent(scrollPane);

        dialog.setResultConverter(dialogButton -> {
            if (dialogButton == saveButtonType) {
                Map<String, String> headers = new HashMap<>();
                for (Map.Entry<TextField, TextField> entry : fields) {
                    String key = entry.getKey().getText().trim();
                    String value = entry.getValue().getText().trim();
                    if (!key.isEmpty()) {
                        headers.put(key, value);
                    }
                }
                return headers;
            }
            return null;
        });

        return dialog.showAndWait();
    }
}
