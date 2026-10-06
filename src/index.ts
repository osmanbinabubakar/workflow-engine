import { WorkflowDatabase } from "./database";

export type WorkflowState = {
  id: string;
  name: string;
};

export type WorkflowTransition = {
  id: string;
  from: string;
  to: string;
  rule?: (instance: WorkflowInstance) => boolean;
  action?: (instance: WorkflowInstance) => void;
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  initialState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
};

export type WorkflowInstance = {
  id: string;
  workflowId: string;
  currentState: string;
};

export type WorkflowHistoryEntry = {
  transitionId: string;
  fromState: string;
  toState: string;
  timestamp: Date;
};

export class WorkflowEngine {
  private definitions = new Map<string, WorkflowDefinition>();
  private instances = new Map<string, WorkflowInstance>();
  private history = new Map<string, WorkflowHistoryEntry[]>();

  constructor(private database?: WorkflowDatabase) {}

  registerWorkflow(definition: WorkflowDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Workflow already exists: ${definition.id}`);
    }

    this.definitions.set(definition.id, definition);

    if (this.database) {
      this.database.saveWorkflow(definition.id, definition);
    }
  }

  createInstance(
    workflowId: string,
    instanceId: string
  ): WorkflowInstance {
    const workflow = this.definitions.get(workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const instance: WorkflowInstance = {
      id: instanceId,
      workflowId,
      currentState: workflow.initialState,
    };

    this.instances.set(instanceId, instance);

    if (this.database) {
      this.database.saveInstance(
        instanceId,
        instance.workflowId,
        instance.currentState
      );
    }

    return instance;
  }

  transition(instanceId: string, transitionId: string): void {
    const instance = this.instances.get(instanceId);

    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const workflow = this.definitions.get(instance.workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${instance.workflowId}`);
    }

    const transition = workflow.transitions.find(
      (item) =>
        item.id === transitionId &&
        item.from === instance.currentState
    );

    if (!transition) {
      throw new Error(
        `Invalid transition: ${transitionId} from state ${instance.currentState}`
      );
    }

    if (transition.rule && !transition.rule(instance)) {
      throw new Error(`Transition rule failed: ${transitionId}`
      );
    }

    instance.currentState = transition.to;

    if (transition.action) {
      transition.action(instance);
    }

    const timestamp = new Date();

    const entries = this.history.get(instanceId) ?? [];

    entries.push({
      transitionId,
      fromState: transition.from,
      toState: transition.to,
      timestamp,
    });

    this.history.set(instanceId, entries);

    if (this.database) {
      this.database.updateInstanceState(
        instance.id,
        instance.currentState
      );

      this.database.saveHistory(
        instance.id,
        transitionId,
        transition.from,
        transition.to,
        timestamp
      );
    }
  }
  getHistory(instanceId: string): WorkflowHistoryEntry[] {
    return this.history.get(instanceId) ?? [];
  }

  getInstance(instanceId: string): WorkflowInstance{
    const instance = this.instances.get(instanceId);

    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    return instance;
  }
}