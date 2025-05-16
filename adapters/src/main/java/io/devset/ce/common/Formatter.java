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

package io.devset.ce.common;

import javafx.scene.control.TextField;
import javafx.scene.control.TextFormatter;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.Optional;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class Formatter {

    public static TextFormatter<String> numberFormatter() {
        return new TextFormatter<>(change -> {
            String newText = change.getControlNewText();
            if (newText.matches("\\d*")) {
                return change;
            }
            return null;
        });
    }

    public static int getNumeric(TextField textField, int defaultValue) {
        return Optional.ofNullable(textField.getText())
                .filter(text -> !text.isBlank())
                .map(text -> {
                    try {
                        return Integer.parseInt(text);
                    } catch (NumberFormatException e) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    public static String getText(TextField textField, String defaultValue) {
        return Optional.ofNullable(textField.getText())
                .filter(text -> !text.isBlank())
                .orElse(defaultValue);
    }

}
