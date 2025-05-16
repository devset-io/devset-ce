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

public class SchemaPayloadDialog {

    private SchemaPayloadDialog() {
        throw new IllegalStateException("Utility class");
    }

    public static void showSchemaPayloadDialog(SchemaDto assigned, FlowNodeDto schemaNode) {

        if (assigned != null) {
            Dialog<ButtonType> dialog = new Dialog<>();
            dialog.setTitle("Schema Assigned");
            dialog.setHeaderText("Schema: " + assigned.getName());

            TextArea textArea = new TextArea(assigned.getPayload());
            textArea.setEditable(false);
            textArea.setWrapText(false);
            textArea.setPrefWidth(400);
            textArea.setPrefHeight(300);

            dialog.getDialogPane().setContent(textArea);

            ButtonType removeBtn = new ButtonType("Remove", ButtonBar.ButtonData.OTHER);
            ButtonType okBtn = new ButtonType("OK", ButtonBar.ButtonData.OK_DONE);
            dialog.getDialogPane().getButtonTypes().setAll(removeBtn, okBtn);

            dialog.setResultConverter(button -> {
                if (button == removeBtn) {
                    schemaNode.setSchemaId(null);
                }
                return button;
            });

            dialog.showAndWait();
        }
    }
}
