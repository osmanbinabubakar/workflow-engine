import { describe, expect, it } from "vitest";
import { createApp } from "./server";
import { WorkflowDatabase } from "./database";


describe("Workflow API", () => {
    it("registers a workflow", async () => {
        const app = createApp(new WorkflowDatabase(":memory:"));

        const response = await app.inject({
            method: "POST",
            url: "/workflows",
            payload: {
                id: "approval",
                name: "Approval Workflow",
                initialState: "submitted",
                states: [
                    { id: "submitted", name: "Submitted" },
                    { id: "approved", name: "Approved" },
                ],
                transitions: [
                    {
                        id: "approve",
                        from: "submitted",
                        to: "approved",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(201);
        expect(response.json()).toEqual({
            message: "Workflow registered",
            workflowId: "approval",
        });

        await app.close();
    });

    it("creates an instance and transitions it", async () => {
        const app = createApp(new WorkflowDatabase(":memory:"));

        await app.inject({
            method: "POST",
            url: "/workflows",
            payload: {
                id: "approval",
                name: "Approval Workflow",
                initialState: "submitted",
                states: [
                    { id: "submitted", name: "Submitted" },
                    { id: "approved", name: "Approved" },
                ],
                transitions: [
                    {
                        id: "approve",
                        from: "submitted",
                        to: "approved",
                    },
                ],
            },
        });

        const instanceResponse = await app.inject({
            method: "POST",
            url: "/instances",
            payload: {
                workflowId: "approval",
                instanceId: "REQ-1001",
            },
        });

        expect(instanceResponse.statusCode).toBe(201);
        expect(instanceResponse.json().currentState).toBe("submitted");

        const transitionResponse = await app.inject({
            method: "POST",
            url: "/instances/REQ-1001/transitions",
            payload: {
                transitionId: "approve",
            },
        });

        expect(transitionResponse.statusCode).toBe(200);
        expect(transitionResponse.json().currentState).toBe("approved");

        await app.close();
    });

    it("returns transition history", async () => {
        const app = createApp(new WorkflowDatabase(":memory:"));

        await app.inject({
            method: "POST",
            url: "/workflows",
            payload: {
                id: "approval",
                name: "Approval Workflow",
                initialState: "submitted",
                states: [
                    { id: "submitted", name: "Submitted" },
                    { id: "approved", name: "Approved" },
                ],
                transitions: [
                    {
                        id: "approve",
                        from: "submitted",
                        to: "approved",
                    },
                ],
            },
        });

        await app.inject({
            method: "POST",
            url: "/instances",
            payload: {
                workflowId: "approval",
                instanceId: "REQ-1002",
            },
        });

        await app.inject({
            method: "POST",
            url: "/instances/REQ-1002/transitions",
            payload: {
                transitionId: "approve",
            },
        });

        const response = await app.inject({
            method: "GET",
            url: "/instances/REQ-1002/history",
        });

        expect(response.statusCode).toBe(200);

        const history = response.json();

        expect(history).toHaveLength(1);
        expect(history[0].transitionId).toBe("approve");
        expect(history[0].fromState).toBe("submitted");
        expect(history[0].toState).toBe("approved");

        await app.close();
    });

    it("rejects an invalid workflow definition", async () => {
        const app = createApp(new WorkflowDatabase(":memory:"));

        const response = await app.inject({
            method: "POST",
            url: "/workflows",
            payload: {
                id: "invalid-workflow",
                name: "Invalid Workflow",
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            error: "Invalid workflow definition",
        });

        await app.close();
    });

    it("rejects a workflow with invalid states", async () => {
        const app = createApp(new WorkflowDatabase(":memory:"));

        const response = await app.inject({
            method: "POST",
            url: "/workflows",
            payload: {
                id: "invalid-workflow",
                name: "Invalid Workflow",
                initialState: "submitted",
                states: "not-an-array",
                transitions: [],
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            error: "Invalid workflow definition",
        });

        await app.close();
    });

    it("rejects a workflow with an invalid initial state", async () => {
        const app = createApp(new WorkflowDatabase(":memory:"));

        const response = await app.inject({
            method: "POST",
            url: "/workflows",
            payload: {
                id: "invalid-initial-state",
                name: "Invalid Workflow",
                initialState: "missing",
                states: [
                    { id: "submitted", name: "Submitted" },
                ],
                transitions: [],
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            error: "Invalid workflow definition",
        });

        await app.close();
    });

    it("rejects a workflow with a transition referencing an unknown state", async () => {
        const app = createApp(new WorkflowDatabase(":memory:"));

        const response = await app.inject({
            method: "POST",
            url: "/workflows",
            payload: {
                id: "invalid-transition-state",
                name: "Invalid Workflow",
                initialState: "submitted",
                states: [
                    { id: "submitted", name: "Submitted" },
                ],
                transitions: [
                    {
                        id: "approve",
                        from: "submitted",
                        to: "approved",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            error: "Invalid workflow definition",
        });

        await app.close();
    });

    it("rejects a workflow with no states", async () => {
        const app = createApp(new WorkflowDatabase(":memory:"));

        const response = await app.inject({
            method: "POST",
            url: "/workflows",
            payload: {
                id: "empty-workflow",
                name: "Empty Workflow",
                initialState: "submitted",
                states: [],
                transitions: [],
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({
            error: "Invalid workflow definition",
        });

        await app.close();
    });
});