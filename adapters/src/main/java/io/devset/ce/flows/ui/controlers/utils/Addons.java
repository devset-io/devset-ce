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

package io.devset.ce.flows.ui.controlers.utils;

import javafx.scene.control.Label;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Line;
import javafx.scene.shape.Polygon;

public class Addons {

    private Addons() {
        throw new IllegalStateException("Utility class");
    }

    public static void connectNodesWithArrow(Pane canvasPane, Label from, Label to, double spacing) {

        Line line = new Line();
        line.startXProperty().bind(from.layoutXProperty().add(from.widthProperty().divide(2)));
        line.startYProperty().bind(from.layoutYProperty().add(from.heightProperty().divide(2)));
        line.endXProperty().bind(to.layoutXProperty().add(to.widthProperty().divide(2)));
        line.endYProperty().bind(to.layoutYProperty().add(to.heightProperty().divide(2)));
        line.setStroke(Color.GRAY);
        line.setStrokeWidth(2);

        if (canvasPane.getChildren().isEmpty()) {
            canvasPane.getChildren().add(line);
        } else {
            canvasPane.getChildren().add(0, line);
        }

        Runnable updater = () -> {
            canvasPane.getChildren().removeIf(node -> node.getUserData() != null && node.getUserData().equals(line));

            double sx = line.getStartX();
            double sy = line.getStartY();
            double ex = line.getEndX();
            double ey = line.getEndY();

            double dx = ex - sx;
            double dy = ey - sy;
            double length = Math.sqrt(dx * dx + dy * dy);
            double angle = Math.atan2(dy, dx);
            double arrowLength = 12.0;

            int count = (int) (length / spacing);
            for (int i = 1; i < count; i++) {
                double x = sx + (dx * i * spacing / length);
                double y = sy + (dy * i * spacing / length);

                double offsetX = Math.cos(angle) * arrowLength / 2;
                double offsetY = Math.sin(angle) * arrowLength / 2;

                Polygon arrow = new Polygon(
                        0.0, 0.0,
                        -arrowLength, -4.0,
                        -arrowLength, 4.0
                );
                arrow.setFill(Color.DARKGRAY);
                arrow.setLayoutX(x + offsetX);
                arrow.setLayoutY(y + offsetY);
                arrow.setRotate(Math.toDegrees(angle));
                arrow.setUserData(line);


                canvasPane.getChildren().add(arrow);
            }
        };

        line.startXProperty().addListener((obs, o, n) -> updater.run());
        line.startYProperty().addListener((obs, o, n) -> updater.run());
        line.endXProperty().addListener((obs, o, n) -> updater.run());
        line.endYProperty().addListener((obs, o, n) -> updater.run());

        updater.run();
    }}
