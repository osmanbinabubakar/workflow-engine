import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { WorkflowEngine } from "./index";

function createTestApp() {
  const app = Fastify();
  const engine = new WorkflowEngine();

  app.post("/workflows", async (request, reply) => {
    const workflow = request.body as Parameters<
      WorkflowEngine["registerWorkflow"]
    >[0];

    try {
      engine.registerWorkflow(workflow);

      return reply.code(201).send({
        message: "Workflow registered",
        workflowId: workflow.id,
      });
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/instances", async (request, reply) => {
    const body = request.body as {
      workflowId: string;
      instanceId: string;
    };

    try {
      return reply
        .code(201)
        .send(engine.createInstance(body.workflowId, body.instanceId));
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/instances/:id/transitions", async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { transitionId: string };

    try {
      engine.transition(params.id, body.transitionId);
      return reply.send(engine.getInstance(params.id));
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/instances/:id", async (request, reply) => {
    const params = request.params as { id: string };

    try {
      return reply.send(engine.getInstance(params.id));
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/instances/:id/history", async (request, reply) => {
    const params = request.params as { id: string };

    return reply.send(engine.getHistory(params.id));
  });

  return app;
}

describe("Workflow API", () => {
  it("registers a workflow", async () => {
    const app = createTestApp();

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
    const app = createTestApp();

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
    const app = createTestApp();

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
});