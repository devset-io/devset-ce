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

package io.devset.ce.kafka.ui.controllers;

import io.devset.ce.kafka.KafkaFacade;
import io.devset.ce.kafka.dto.KafkaConnectDto;
import io.devset.ce.kafka.events.KafkaConnectResults;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import static io.devset.ce.common.Formatter.*;

@Component
public class KafkaTopContainerController {

    private final KafkaFacade kafkaFacade;
    private final KafkaUIState kafkaUIState;

    @FXML
    private TextField kafkaUrlField;
    @FXML
    private TextField portField;
    @FXML
    private TextField userField;
    @FXML
    private TextField passwordField;
    @FXML
    private Label connectedLabel;
    @FXML
    private Label disconnectedLabel;
    @FXML
    private Button connectButton;

    public KafkaTopContainerController(KafkaFacade kafkaFacade) {
        this.kafkaFacade = kafkaFacade;
        this.kafkaUIState = KafkaUIState.getInstance();
    }

    @EventListener
    public void handleKafkaConnection(KafkaConnectResults event) {
        kafkaUIState.setConnected(event.isConnected());
        handleConnectionLabel();
    }

    @FXML
    private void handleConnectionToggle() {
        if (kafkaUIState.isConnected()) {
            disconnect();
        } else {
            connect();
        }
    }

    private void disconnect() {
        kafkaFacade.disconnect();
    }

    @FXML
    public void initialize() {
        portField.setTextFormatter(numberFormatter());
        handleConnectionLabel();
        this.kafkaUrlField.setText(kafkaUIState.getConnectDto().url());
        this.portField.setText(String.valueOf(kafkaUIState.getConnectDto().port()));
        this.passwordField.setText(kafkaUIState.getConnectDto().password());
    }

    private void handleConnectionLabel() {
        Platform.runLater(() -> {
            boolean connected = kafkaUIState.isConnected();
            connectedLabel.setVisible(connected);
            disconnectedLabel.setVisible(!connected);
            connectButton.setText(connected ? "Disconnect" : "Connect");
            setDisable(connected);
        });
    }

    private void setDisable(boolean connected) {
        kafkaUrlField.setDisable(connected);
        portField.setDisable(connected);
        userField.setDisable(connected);
        passwordField.setDisable(connected);
    }


    @FXML
    private void connect() {
        var url = getText(kafkaUrlField, this.kafkaUIState.getConnectDto().url());
        int port = getNumeric(portField, this.kafkaUIState.getConnectDto().port());
        var user = userField.getText();
        var password = passwordField.getText();
        var connectDto = new KafkaConnectDto(url, port, user, password);
        kafkaFacade.tryConnect(connectDto);
        kafkaUIState.setConnectedData(connectDto);
    }

}
