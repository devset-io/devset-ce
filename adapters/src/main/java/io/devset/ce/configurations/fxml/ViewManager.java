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

import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Properties;

@Component
public class ViewManager {

    private final SpringFxmlLoader loader;
    private BaseLayoutController baseLayoutController;

    @Autowired
    public ViewManager(SpringFxmlLoader loader) {
        this.loader = loader;
    }

    public void setPrimaryStage(Stage stage) {
        Parent root = loader.load("/fxml/BaseLayout.fxml");
        baseLayoutController = loader.getLastController();
        Scene scene = new Scene(root, 1024.0, 768.0);
        stage.setScene(scene);
        String version = getApplicationVersion();
        stage.setTitle("Devset CE " + version);

        stage.show();
    }

    private String getApplicationVersion() {
        try (InputStream in = getClass().getResourceAsStream("/version.properties")) {
            Properties props = new Properties();
            props.load(in);
            return props.getProperty("app.version", "dev");
        } catch (Exception e) {
            return "dev";
        }
    }

    public void switchContent(String fxmlView) {
        Parent newContent = loader.load("/fxml/" + fxmlView + ".fxml");
        baseLayoutController.setContent(newContent);
    }
}