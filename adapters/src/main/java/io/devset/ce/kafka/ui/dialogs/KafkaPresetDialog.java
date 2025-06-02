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

package io.devset.ce.kafka.ui.dialogs;

import io.devset.ce.kafka.dto.NewKafkaTopicDto;
import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.*;

import java.util.*;

public class KafkaPresetDialog {

    private KafkaPresetDialog() {
        throw new IllegalStateException("Utility class");
    }

    public static Optional<NewKafkaTopicDto> showDialog(NewKafkaTopicDto presetToEdit) {
        Dialog<NewKafkaTopicDto> dialog = new Dialog<>();
        dialog.setTitle("Kafka topic");
        dialog.setHeaderText("Configure Kafka Topics");
        ButtonType saveButtonType = new ButtonType("Save", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(saveButtonType, ButtonType.CANCEL);
        dialog.getDialogPane().setPrefWidth(550);

        TextField topicField = new TextField();
        TextField keyField = new TextField();
        Arrays.asList(topicField, keyField)
                .forEach(tf -> {
                    tf.setMaxWidth(Double.MAX_VALUE);
                    GridPane.setHgrow(tf, Priority.ALWAYS);
                });

        // Headers
        VBox headersBox = new VBox(5);
        headersBox.setPadding(new Insets(5));
        ScrollPane headersScrollPane = new ScrollPane(headersBox);
        headersScrollPane.setFitToWidth(true);
        headersScrollPane.setPrefHeight(120);
        headersScrollPane.setMaxWidth(Double.MAX_VALUE);
        GridPane.setHgrow(headersScrollPane, Priority.ALWAYS);

        Button addHeaderButton = new Button("+ Add Header");
        addHeaderButton.setOnAction(e -> headersBox.getChildren().add(createHeaderRow("", "", headersBox)));


        Spinner<Integer> partitionsSpinner = new Spinner<>(1, 1000, 1);
        Spinner<Integer> replicationSpinner = new Spinner<>(1, 10, 1);
        ComboBox<String> cleanupPolicyBox = new ComboBox<>();
        cleanupPolicyBox.getItems().addAll("delete", "compact");
        cleanupPolicyBox.setValue("delete");

        Arrays.asList(partitionsSpinner, replicationSpinner, cleanupPolicyBox)
                .forEach(c -> {
                    c.setMaxWidth(Double.MAX_VALUE);
                    GridPane.setHgrow(c, Priority.ALWAYS);
                });

        TextField retentionField = new TextField("604800000");
        retentionField.setMaxWidth(Double.MAX_VALUE);
        GridPane.setHgrow(retentionField, Priority.ALWAYS);

        HBox retentionShortcuts = new HBox(5);
        retentionShortcuts.setPadding(new Insets(5, 0, 0, 0));
        Map.of("12h", "43200000", "1d", "86400000", "7d", "604800000", "4w", "2419200000")
                .forEach((label, val) -> {
                    Button btn = new Button(label);
                    btn.setOnAction(e -> retentionField.setText(val));
                    retentionShortcuts.getChildren().add(btn);
                });
//todo
//        if (presetToEdit != null) {
//            topicField.setText(presetToEdit.topic());
//            keyField.setText(presetToEdit.key());
//            if (presetToEdit.headers() != null) {
//                presetToEdit.headers().forEach((k, v) -> headersBox.getChildren().add(createHeaderRow(k, v, headersBox)));
//            }
//        }

        // GridPane Layout
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(20));

        ColumnConstraints labelCol = new ColumnConstraints();
        ColumnConstraints inputCol = new ColumnConstraints();
        inputCol.setHgrow(Priority.ALWAYS);
        grid.getColumnConstraints().addAll(labelCol, inputCol);

        grid.add(new Label("Topic:"), 0, 0);
        grid.add(topicField, 1, 0);

        grid.add(new Label("Key:"), 0, 1);
        grid.add(keyField, 1, 1);

        grid.add(new Label("Headers:"), 0, 2);
        VBox headerArea = new VBox(5, headersScrollPane, addHeaderButton);
        headerArea.setMaxWidth(Double.MAX_VALUE);
        GridPane.setHgrow(headerArea, Priority.ALWAYS);
        grid.add(headerArea, 1, 2);

        grid.add(new Label("Partitions:"), 0, 3);
        grid.add(partitionsSpinner, 1, 3);

        grid.add(new Label("Replication Factor:"), 0, 4);
        grid.add(replicationSpinner, 1, 4);

        grid.add(new Label("Cleanup Policy:"), 0, 5);
        grid.add(cleanupPolicyBox, 1, 5);

        grid.add(new Label("Retention Time (ms):"), 0, 6);
        grid.add(retentionField, 1, 6);
        grid.add(retentionShortcuts, 1, 7);

        dialog.getDialogPane().setContent(grid);

        dialog.setResultConverter(button -> {
            if (button == saveButtonType) {
                Map<String, String> headers = new LinkedHashMap<>();
                for (var node : headersBox.getChildren()) {
                    if (node instanceof GridPane row) {
                        TextField k = (TextField) row.getChildren().get(0);
                        TextField v = (TextField) row.getChildren().get(1);
                        if (!k.getText().isBlank()) headers.put(k.getText().trim(), v.getText().trim());
                    }
                }


                return new NewKafkaTopicDto(
                        topicField.getText().trim(),
                        partitionsSpinner.getValue(),
                        replicationSpinner.getValue(),
                        cleanupPolicyBox.getValue(),
                        parseLongOrDefault(retentionField.getText(), 604800000)
                );
            }
            return null;
        });

        return dialog.showAndWait();
    }

    private static GridPane createHeaderRow(String key, String value, VBox parent) {
        TextField keyField = new TextField(key);
        TextField valueField = new TextField(value);
        Button removeButton = new Button("✕");
        keyField.setMaxWidth(Double.MAX_VALUE);
        valueField.setMaxWidth(Double.MAX_VALUE);
        GridPane.setHgrow(keyField, Priority.ALWAYS);
        GridPane.setHgrow(valueField, Priority.ALWAYS);

        GridPane row = new GridPane();
        row.setHgap(5);
        row.getColumnConstraints().addAll(new ColumnConstraints(), new ColumnConstraints(), new ColumnConstraints());
        row.add(keyField, 0, 0);
        row.add(valueField, 1, 0);
        row.add(removeButton, 2, 0);
        removeButton.setOnAction(e -> parent.getChildren().remove(row));
        return row;
    }

    private static long parseLongOrDefault(String text, long def) {
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException e) {
            return def;
        }
    }
}