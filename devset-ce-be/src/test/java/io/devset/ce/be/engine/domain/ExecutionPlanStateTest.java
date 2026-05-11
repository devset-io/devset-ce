/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.domain;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ExecutionPlanStateTest {

    private ExecutionPlanState state;

    @BeforeEach
    void setUp() {
        LinkedHashMap<String, Object> nested = new LinkedHashMap<>();
        nested.put("bar", "nestedValue");
        nested.put("num", 42);

        LinkedHashMap<String, Object> deep = new LinkedHashMap<>();
        deep.put("leaf", "deepValue");
        nested.put("deep", deep);

        LinkedHashMap<String, Object> initial = new LinkedHashMap<>();
        initial.put("key", "value");
        initial.put("foo", nested);

        state = new ExecutionPlanState(initial);
    }

    @Nested
    class Get {

        @Test
        void shouldReturnTopLevelValue() {
            assertEquals("value", state.get("key"));
        }

        @Test
        void shouldReturnNestedValue() {
            assertEquals("nestedValue", state.get("foo.bar"));
        }

        @Test
        void shouldReturnDeeplyNestedValue() {
            assertEquals("deepValue", state.get("foo.deep.leaf"));
        }

        @Test
        void shouldReturnIntegerValue() {
            assertEquals(42, state.get("foo.num"));
        }

        @Test
        void shouldReturnNestedMapAsObject() {
            Object result = state.get("foo.deep");
            assertInstanceOf(Map.class, result);
        }

        @Test
        void shouldThrowWhenTopLevelKeyMissing() {
            WorkflowEngineException ex = assertThrows(
                    WorkflowEngineException.class, () -> state.get("missing"));
            assertTrue(ex.getMessage().contains("missing"));
        }

        @Test
        void shouldThrowWhenIntermediatePathMissing() {
            WorkflowEngineException ex = assertThrows(
                    WorkflowEngineException.class, () -> state.get("foo.nonexistent.leaf"));
            assertTrue(ex.getMessage().contains("foo.nonexistent.leaf"));
        }

        @Test
        void shouldThrowWhenIntermediateIsNotAMap() {
            WorkflowEngineException ex = assertThrows(
                    WorkflowEngineException.class, () -> state.get("key.child"));
            assertTrue(ex.getMessage().contains("key.child"));
        }
    }

    @Nested
    class GetOrDefault {

        @Test
        void shouldReturnValueWhenPathExists() {
            assertEquals("value", state.getOrDefault("key", "fallback"));
        }

        @Test
        void shouldReturnNestedValueWhenPathExists() {
            assertEquals("nestedValue", state.getOrDefault("foo.bar", "fallback"));
        }

        @Test
        void shouldReturnDefaultWhenTopLevelKeyMissing() {
            assertEquals("fallback", state.getOrDefault("missing", "fallback"));
        }

        @Test
        void shouldReturnDefaultWhenIntermediatePathMissing() {
            assertEquals("fallback", state.getOrDefault("foo.nonexistent.leaf", "fallback"));
        }

        @Test
        void shouldReturnDefaultWhenIntermediateIsNotAMap() {
            assertEquals("fallback", state.getOrDefault("key.child", "fallback"));
        }

        @Test
        void shouldReturnNullDefault() {
            assertNull(state.getOrDefault("missing", null));
        }
    }

    @Nested
    class Put {

        @Test
        void shouldSetTopLevelValue() {
            state.put("newKey", "newValue");
            assertEquals("newValue", state.get("newKey"));
        }

        @Test
        void shouldOverwriteExistingTopLevelValue() {
            state.put("key", "overwritten");
            assertEquals("overwritten", state.get("key"));
        }

        @Test
        void shouldSetNestedValueInExistingMap() {
            state.put("foo.newChild", "childValue");
            assertEquals("childValue", state.get("foo.newChild"));
        }

        @Test
        void shouldCreateIntermediateMapsWhenMissing() {
            state.put("a.b.c", "created");
            assertEquals("created", state.get("a.b.c"));
            assertInstanceOf(Map.class, state.get("a"));
            assertInstanceOf(Map.class, state.get("a.b"));
        }

        @Test
        void shouldCreateDeeplyNestedPath() {
            state.put("x.y.z.w", "deep");
            assertEquals("deep", state.get("x.y.z.w"));
        }

        @Test
        void shouldOverwriteNestedValue() {
            state.put("foo.bar", "updated");
            assertEquals("updated", state.get("foo.bar"));
        }

        @Test
        void shouldThrowWhenIntermediateIsNotAMap() {
            assertThrows(WorkflowEngineException.class,
                    () -> state.put("key.nested.value", "fail"));
        }

        @Test
        void shouldAllowNullValue() {
            state.put("foo.bar", null);
            assertNull(state.get("foo.bar"));
        }
    }

    @Nested
    class Remove {

        @Test
        void shouldRemoveTopLevelKey() {
            state.remove("key");
            assertThrows(WorkflowEngineException.class, () -> state.get("key"));
        }

        @Test
        void shouldRemoveNestedKey() {
            state.remove("foo.bar");
            assertThrows(WorkflowEngineException.class, () -> state.get("foo.bar"));
            // sibling should still exist
            assertEquals(42, state.get("foo.num"));
        }

        @Test
        void shouldRemoveDeeplyNestedKey() {
            state.remove("foo.deep.leaf");
            assertThrows(WorkflowEngineException.class, () -> state.get("foo.deep.leaf"));
        }

        @Test
        void shouldBeNoOpWhenTopLevelKeyMissing() {
            assertDoesNotThrow(() -> state.remove("nonexistent"));
        }

        @Test
        void shouldBeNoOpWhenIntermediatePathMissing() {
            assertDoesNotThrow(() -> state.remove("foo.nonexistent.leaf"));
        }

        @Test
        void shouldBeNoOpWhenIntermediateIsNotAMap() {
            assertDoesNotThrow(() -> state.remove("key.child.value"));
        }
    }

    @Nested
    class Snapshot {

        @Test
        void shouldReturnMapWithSameValues() {
            Map<String, Object> snap = state.snapshot();
            assertEquals("value", snap.get("key"));
        }

        @Test
        void shouldReturnLinkedHashMap() {
            assertInstanceOf(LinkedHashMap.class, state.snapshot());
        }

        @Test
        @SuppressWarnings("unchecked")
        void shouldDeepCopyNestedMaps() {
            Map<String, Object> snap = state.snapshot();
            Map<String, Object> nestedSnap = (Map<String, Object>) snap.get("foo");
            assertInstanceOf(LinkedHashMap.class, nestedSnap);
            assertEquals("nestedValue", nestedSnap.get("bar"));
        }

        @Test
        @SuppressWarnings("unchecked")
        void shouldIsolateSnapshotFromOriginalMutations() {
            Map<String, Object> snap = state.snapshot();

            // mutate original state
            state.put("key", "changed");
            state.put("foo.bar", "changed");

            // snapshot should be unaffected
            assertEquals("value", snap.get("key"));
            Map<String, Object> nestedSnap = (Map<String, Object>) snap.get("foo");
            assertEquals("nestedValue", nestedSnap.get("bar"));
        }

        @Test
        @SuppressWarnings("unchecked")
        void shouldIsolateOriginalFromSnapshotMutations() {
            Map<String, Object> snap = state.snapshot();

            // mutate snapshot
            snap.put("key", "snapChanged");
            Map<String, Object> nestedSnap = (Map<String, Object>) snap.get("foo");
            nestedSnap.put("bar", "snapChanged");

            // original should be unaffected
            assertEquals("value", state.get("key"));
            assertEquals("nestedValue", state.get("foo.bar"));
        }

        @Test
        void shouldHandleEmptyState() {
            ExecutionPlanState empty = new ExecutionPlanState(new LinkedHashMap<>());
            Map<String, Object> snap = empty.snapshot();
            assertTrue(snap.isEmpty());
        }
    }

    @Test
    void initialValuesShouldBeIsolatedFromOriginalMap() {
        LinkedHashMap<String, Object> original = new LinkedHashMap<>();
        original.put("a", "1");
        ExecutionPlanState s = new ExecutionPlanState(original);

        original.put("b", "2");

        assertThrows(WorkflowEngineException.class, () -> s.get("b"));
    }
}
