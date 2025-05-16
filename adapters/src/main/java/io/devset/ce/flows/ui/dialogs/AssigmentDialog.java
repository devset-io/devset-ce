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

import io.devset.ce.flows.dto.FlowNodeDto;
import io.devset.ce.schemas.dto.SchemaDto;
import javafx.scene.control.*;
import javafx.util.StringConverter;

import java.util.List;

public class AssigmentDialog {

    private AssigmentDialog() {
        throw new IllegalStateException("Utility class");
    }

    private static final ButtonType assignBtn = new ButtonType("Assign", ButtonBar.ButtonData.OK_DONE);
    private static final ButtonType removeBtn = new ButtonType("Remove", ButtonBar.ButtonData.OTHER);
    private static final ButtonType cancelBtn = new ButtonType("Cancel", ButtonBar.ButtonData.CANCEL_CLOSE);

    public static void showAssigmentDialog(FlowNodeDto node, List<SchemaDto> availableSchemas) {

        Dialog<Void> dialog = new Dialog<>();
        dialog.setTitle("Schema Assignment");
        dialog.setHeaderText("Assign schema ");

        // Dropdown
        ComboBox<SchemaDto> comboBox = new ComboBox<>();
        comboBox.getItems().addAll(availableSchemas);

        comboBox.getItems().addAll(availableSchemas);

        comboBox.setConverter(new StringConverter<>() {
            @Override
            public String toString(SchemaDto dto) {
                return dto == null ? "" : dto.toDisplayName();
            }

            @Override
            public SchemaDto fromString(String string) {
                return null;
            }
        });

        var current = node.getId();
        if (current != null) {
            availableSchemas.stream().filter(it -> it.getId().equals(current)).findFirst().ifPresent(comboBox::setValue);

        }
        dialogButton(node, dialog, comboBox);
        dialog.showAndWait();

    }

    private static void dialogButton(FlowNodeDto node, Dialog<Void> dialog, ComboBox<SchemaDto> comboBox) {
        dialog.getDialogPane().getButtonTypes().addAll(assignBtn, removeBtn, cancelBtn);
        dialog.getDialogPane().setContent(comboBox);

        dialog.setResultConverter(dialogButton -> {
            if (dialogButton == assignBtn && comboBox.getValue() != null) {
                node.setSchemaId(comboBox.getValue().getId());
            } else if (dialogButton == removeBtn) {
                node.setSchemaId(null);
            }
            return null;
        });
    }
}
