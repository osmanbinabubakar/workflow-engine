import { describe, expect, it } from "vitest";
import { WorkflowEngine } from "./index";

describe("WorkflowEngine", () => {
  it("moves an instance through a valid transition", () => {
  const engine = new WorkflowEngine();

  engine.registerWorkflow({
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
  });

  const instance = engine.createInstance("approval", "request-002");

  engine.transition("request-002", "approve");

  expect(instance.currentState).toBe("approved");
});

  it("creates an instance in the workflow's initial state", () => {
    const engine = new WorkflowEngine();

    engine.registerWorkflow({
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
    });

    const instance = engine.createInstance("approval", "request-001");

    expect(instance.currentState).toBe("submitted");
  });

it("rejects an invalid transition", () => {
  const engine = new WorkflowEngine();

  engine.registerWorkflow({
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
  });

  engine.createInstance("approval", "request-003");

  expect(() => {
    engine.transition("request-003", "does-not-exist");
  }).toThrow();
});

it("records transition history", () => {
  const engine = new WorkflowEngine();

  engine.registerWorkflow({
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
  });

  engine.createInstance("approval", "request-004");

  engine.transition("request-004", "approve");

  const history = engine.getHistory("request-004");

  expect(history).toHaveLength(1);
  expect(history[0].transitionId).toBe("approve");
  expect(history[0].fromState).toBe("submitted");
  expect(history[0].toState).toBe("approved");
});

it("rejects a transition when its rule fails", () => {
  const engine = new WorkflowEngine();

  engine.registerWorkflow({
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
        rule: () => false,
      },
    ],
  });

  engine.createInstance("approval", "request-005");

  expect(() => {
    engine.transition("request-005", "approve");
  }).toThrow("Transition rule failed: approve");
});

it("executes an action after a successful transition", () => {
  const engine = new WorkflowEngine();
  let actionExecuted = false;

  engine.registerWorkflow({
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
        action: () => {
          actionExecuted = true;
        },
      },
    ],
  });

  engine.createInstance("approval", "request-006");

  engine.transition("request-006", "approve");

  expect(actionExecuted).toBe(true);
});

it("retrieves an existing workflow instance", () => {
  const engine = new WorkflowEngine();

  engine.registerWorkflow({
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
  });

  engine.createInstance("approval", "request-007");

  const instance = engine.getInstance("request-007");

  expect(instance.id).toBe("request-007");
  expect(instance.currentState).toBe("submitted");
});
});