import Fastify from "fastify";
import { WorkflowEngine } from "./index";
import { WorkflowDatabase } from "./database";

function isWorkflowDefinition(
    value: unknown
): value is Parameters<WorkflowEngine["registerWorkflow"]>[0] {
    if (!value || typeof value !== "object") {
        return false;
    }

    const workflow = value as Record<string, unknown>;

    if (
        typeof workflow.id !== "string" ||
        typeof workflow.name !== "string" ||
        typeof workflow.initialState !== "string" ||
        !Array.isArray(workflow.states) ||
        !Array.isArray(workflow.transitions)
    ) {
        return false;
    }

    if (workflow.states.length === 0) {
        return false;
    }

    const stateIds = new Set<string>();

    for (const state of workflow.states) {
        if (
            !state ||
            typeof state !== "object" ||
            typeof (state as Record<string, unknown>).id !== "string" ||
            typeof (state as Record<string, unknown>).name !== "string"
        ) {
            return false;
        }

        stateIds.add((state as Record<string, unknown>).id as string);
    }

    if (!stateIds.has(workflow.initialState)) {
        return false;
    }

    for (const transition of workflow.transitions) {
        if (!transition || typeof transition !== "object") {
            return false;
        }

        const item = transition as Record<string, unknown>;

        if (
            typeof item.id !== "string" ||
            typeof item.from !== "string" ||
            typeof item.to !== "string"
        ) {
            return false;
        }

        if (!stateIds.has(item.from) || !stateIds.has(item.to)) {
            return false;
        }
    }

    return true;
}

export function createApp(database = new WorkflowDatabase()) {
    const app = Fastify({
        logger: true,
    });

    const engine = new WorkflowEngine(database);

    app.get("/health", async () => {
        return {
            status: "ok",
        };
    });

    app.post("/workflows", async (request, reply) => {
        const workflow = request.body as unknown;

        if (!isWorkflowDefinition(workflow)) {
            return reply.code(400).send({
                error: "Invalid workflow definition",
            });
        }

        const validWorkflow =
            workflow as Parameters<WorkflowEngine["registerWorkflow"]>[0];

        try {
            engine.registerWorkflow(workflow);

            return reply.code(201).send({
                message: "Workflow registered",
                workflowId: validWorkflow.id,
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

    return app;
}

const start = async () => {
    const app = createApp();

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

if (require.main === module) {
    start();
}