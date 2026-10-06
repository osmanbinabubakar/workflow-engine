import { WorkflowEngine } from "../index";

const engine = new WorkflowEngine();

engine.registerWorkflow({
    id: "purchase-request",
    name: "Purchase Request",
    initialState: "submitted",

    states: [
        { id: "submitted", name: "Submitted" },
        { id: "review", name: "Under Review" },
        { id: "approved", name: "Approved" },
        { id: "rejected", name: "Rejected" },
        { id: "fulfillment", name: "Fulfillment" },
        { id: "completed", name: "Completed" },
    ],

    transitions: [
        {
            id: "start-review",
            from: "submitted",
            to: "review",
        },
        {
            id: "approve",
            from: "review",
            to: "approved",
        },
        {
            id: "reject",
            from: "review",
            to: "rejected",
        },
        {
            id: "start-fulfillment",
            from: "approved",
            to: "fulfillment",
        },
        {
            id: "complete",
            from: "fulfillment",
            to: "completed",
        },
    ],
});

const request = engine.createInstance(
    "purchase-request",
    "PR-1001"
);

engine.transition("PR-1001", "start-review");
engine.transition("PR-1001", "approve");
engine.transition("PR-1001", "start-fulfillment");
engine.transition("PR-1001", "complete");

console.log("Final state:", request.currentState);
console.log("History:", engine.getHistory("PR-1001"));