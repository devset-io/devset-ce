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

package io.devset.ce;

import io.devset.ce.configurations.fxml.ViewManager;
import io.devset.ce.configurations.views.Views;
import javafx.application.Application;
import javafx.stage.Stage;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

public class DevsetCeApplication extends Application {

    private ConfigurableApplicationContext context;

    public static void main(String[] args) {
        Application.launch(DevsetCeApplication.class, args);
    }

    @Override
    public void init() {
        context = new SpringApplicationBuilder(SpringConfig.class).run();
    }

    @Override
    public void start(Stage primaryStage) {
        ViewManager viewManager = context.getBean(ViewManager.class);
        viewManager.setPrimaryStage(primaryStage);
        viewManager.switchContent(Views.MAIN.getPath());
    }

    @Override
    public void stop() {
        context.close();
    }
}
