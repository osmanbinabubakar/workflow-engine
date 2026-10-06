import Fastify from "fastify";
import { WorkflowEngine } from "./index";
import { WorkflowDatabase } from "./database";

const app = Fastify({
  logger: true,
});

const database = new WorkflowDatabase();
const engine = new WorkflowEngine(database);

app.get("/health", async () => {
  return {
    status: "ok",
  };
});

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
    const instance = engine.createInstance(
      body.workflowId,
      body.instanceId
    );

    return reply.code(201).send(instance);
  } catch (error) {
    return reply.code(400).send({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/instances/:id/transitions", async (request, reply) => {
  const params = request.params as {
    id: string;
  };

  const body = request.body as {
    transitionId: string;
  };

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
  const params = request.params as {
    id: string;
  };

  try {
    return reply.send(engine.getInstance(params.id));
  } catch (error) {
    return reply.code(404).send({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/instances/:id/history", async (request, reply) => {
  const params = request.params as {
    id: string;
  };

  try {
    return reply.send(engine.getHistory(params.id));
  } catch (error) {
    return reply.code(404).send({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const start = async () => {
  try {
    await app.listen({
      port: 3000,
      host: "127.0.0.1",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();