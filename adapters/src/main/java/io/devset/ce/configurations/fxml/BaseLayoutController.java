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

import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.Node;
import javafx.scene.control.SplitPane;
import javafx.scene.layout.StackPane;
import org.springframework.stereotype.Component;

@Component
public class BaseLayoutController {

    @FXML
    private StackPane contentContainer;

    @FXML
    private SplitPane splitPane;

    @FXML
    public void initialize() {
        Platform.runLater(() ->
                splitPane.lookupAll(".split-pane-divider")
                        .forEach(div -> div.setMouseTransparent(true))
        );
    }

    public void setContent(Node node) {
        contentContainer.getChildren().setAll(node);
    }
}