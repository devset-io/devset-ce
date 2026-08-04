/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.api;

import io.devset.ce.be.dispatchworkspace.api.dto.DispatchWorkspaceDto;
import io.devset.ce.be.dispatchworkspace.application.DispatchWorkspaceFacade;
import io.devset.ce.be.dispatchworkspace.domain.DispatchWorkspace;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for the message-dispatch workspace (the set of open tabs).
 * <p>
 * Delegates all logic to {@link DispatchWorkspaceFacade}; DTO↔domain conversion is handled by
 * {@link DispatchWorkspaceDtoMapper}. The workspace is a single shared resource, so there is one
 * {@code GET} to load it and one {@code PUT} to replace it wholesale.
 */
@RestController
@RequestMapping("/dispatch-workspace")
@RequiredArgsConstructor
public class DispatchWorkspaceController {

    private final DispatchWorkspaceFacade dispatchWorkspaceFacade;
    private final DispatchWorkspaceDtoMapper dispatchWorkspaceDtoMapper;

    /**
     * Loads the current workspace, or an empty one when nothing has been saved yet.
     *
     * @return the current workspace
     */
    @GetMapping
    public DispatchWorkspaceDto get() {
        return dispatchWorkspaceDtoMapper.toResponse(dispatchWorkspaceFacade.get());
    }

    /**
     * Replaces the whole workspace (last-write-wins).
     *
     * @param request the new workspace
     * @return the persisted workspace
     */
    @PutMapping
    public DispatchWorkspaceDto replace(@RequestBody DispatchWorkspaceDto request) {
        DispatchWorkspace updated = dispatchWorkspaceFacade.replace(dispatchWorkspaceDtoMapper.toDomain(request));
        return dispatchWorkspaceDtoMapper.toResponse(updated);
    }
}
