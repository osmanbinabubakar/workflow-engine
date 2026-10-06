import Database from "better-sqlite3";

export class WorkflowDatabase {
  private db: Database.Database;

  constructor(filename = "workflow.db") {
    this.db = new Database(filename);

    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        definition TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS instances (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        current_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instance_id TEXT NOT NULL,
        transition_id TEXT NOT NULL,
        from_state TEXT NOT NULL,
        to_state TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);
  }

  saveWorkflow(id: string, definition: unknown): void {
    this.db
      .prepare(
        `
        INSERT INTO workflows (id, definition)
        VALUES (?, ?)
        `
      )
      .run(id, JSON.stringify(definition));
  }

  getWorkflow(id: string): unknown | undefined {
    const row = this.db
      .prepare(
        `
        SELECT definition
        FROM workflows
        WHERE id = ?
        `
      )
      .get(id) as { definition: string } | undefined;

    if (!row) {
      return undefined;
    }

    return JSON.parse(row.definition);
  }

  saveInstance(
    id: string,
    workflowId: string,
    currentState: string
  ): void {
    this.db
      .prepare(
        `
        INSERT INTO instances (id, workflow_id, current_state)
        VALUES (?, ?, ?)
        `
      )
      .run(id, workflowId, currentState);
  }

  updateInstanceState(
    id: string,
    currentState: string
  ): void {
    this.db
      .prepare(
        `
        UPDATE instances
        SET current_state = ?
        WHERE id = ?
        `
      )
      .run(currentState, id);
  }

  getInstance(id: string):
    | {
        id: string;
        workflowId: string;
        currentState: string;
      }
    | undefined {
    const row = this.db
      .prepare(
        `
        SELECT id, workflow_id, current_state
        FROM instances
        WHERE id = ?
        `
      )
      .get(id) as
      | {
          id: string;
          workflow_id: string;
          current_state: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      workflowId: row.workflow_id,
      currentState: row.current_state,
    };
  }

  saveHistory(
    instanceId: string,
    transitionId: string,
    fromState: string,
    toState: string,
    timestamp: Date
  ): void {
    this.db
      .prepare(
        `
        INSERT INTO history (
          instance_id,
          transition_id,
          from_state,
          to_state,
          timestamp
        )
        VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(
        instanceId,
        transitionId,
        fromState,
        toState,
        timestamp.toISOString()
      );
  }

  getHistory(instanceId: string): Array<{
    transitionId: string;
    fromState: string;
    toState: string;
    timestamp: Date;
  }> {
    const rows = this.db
      .prepare(
        `
        SELECT
          transition_id,
          from_state,
          to_state,
          timestamp
        FROM history
        WHERE instance_id = ?
        ORDER BY id ASC
        `
      )
      .all(instanceId) as Array<{
        transition_id: string;
        from_state: string;
        to_state: string;
        timestamp: string;
      }>;

    return rows.map((row) => ({
      transitionId: row.transition_id,
      fromState: row.from_state,
      toState: row.to_state,
      timestamp: new Date(row.timestamp),
    }));
  }

  getWorkflows(): unknown[] {
  const rows = this.db
    .prepare(
      `
      SELECT definition
      FROM workflows
      `
    )
    .all() as Array<{
      definition: string;
    }>;

  return rows.map((row) => JSON.parse(row.definition));
}

getInstances(): Array<{
  id: string;
  workflowId: string;
  currentState: string;
}> {
  const rows = this.db
    .prepare(
      `
      SELECT id, workflow_id, current_state
      FROM instances
      `
    )
    .all() as Array<{
      id: string;
      workflow_id: string;
      current_state: string;
    }>;

  return rows.map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    currentState: row.current_state,
  }));
}
}