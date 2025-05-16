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

import io.devset.ce.flows.FlowElement;
import javafx.scene.control.Label;


public class FlowElementFactory {

    private FlowElementFactory() {
        throw new IllegalStateException("Utility class");
    }

    public static Label create(String id, FlowElement elementType, double x, double y) {
        Label node = new Label();
        node.setId(id);
        switch (elementType) {
            case SCHEMA -> {
                node.setUserData(FlowElement.SCHEMA);
                node.setText("Start Message");
                node.setStyle("-fx-background-color: #2980b9; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 5;");
            }
            case LOOP_SENDER -> {
                node.setUserData(FlowElement.LOOP_SENDER);
                node.setText("Loop Sender");
                node.setStyle("-fx-background-color: #8e44ad; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 5;");
            }
            case SINGLE_SENDER -> {
                node.setUserData(FlowElement.SINGLE_SENDER);
                node.setText("Single Sender");
                node.setStyle("-fx-background-color: #d35400; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 5;");
            }
            case CONDITION -> {
                node.setUserData(FlowElement.CONDITION);
                node.setText("Condition");
                node.setStyle("-fx-background-color: #c0392b; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 5;");
            }
            case PROCESSOR -> {
                node.setUserData(FlowElement.PROCESSOR);
                node.setText("Processor");
                node.setStyle("-fx-background-color: #16a085; -fx-text-fill: white; -fx-padding: 5 10; -fx-background-radius: 5;");
            }
            default -> throw new IllegalArgumentException("Unsupported FlowElement type: " + elementType);
        }

        node.setLayoutX(x);
        node.setLayoutY(y);

        return node;
    }
}
