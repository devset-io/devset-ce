/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.application;

import io.devset.ce.be.dispatchworkspace.domain.DispatchWorkspace;

/**
 * Facade for message-dispatch workspace persistence.
 * <p>
 * The workspace is the set of open dispatch tabs. The frontend owns it authoritatively and replaces
 * it wholesale, so this facade exposes only read and replace — there is no per-tab CRUD.
 */
public interface DispatchWorkspaceFacade {

    /**
     * Returns the persisted workspace, or an empty workspace when nothing has been saved yet.
     *
     * @return the current workspace
     */
    DispatchWorkspace get();

    /**
     * Replaces the whole workspace with the given one (last-write-wins).
     *
     * @param workspace the new workspace to persist
     * @return the persisted workspace
     */
    DispatchWorkspace replace(DispatchWorkspace workspace);
}