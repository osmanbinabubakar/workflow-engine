# Workflow Engine

A lightweight, configurable workflow engine for modeling and executing
state-based business processes.

The engine allows applications to define workflows as states and
transitions, create workflow instances, enforce transition rules,
execute actions, persist state, and maintain an audit history of state
changes.

## Why This Exists

Many business processes follow predictable lifecycle patterns:

    Submitted → Review → Approved → Fulfillment → Completed

The domain may change, but the underlying workflow mechanics remain
similar.

This project extracts those mechanics into a reusable workflow engine so
applications can define and execute state-based processes without
embedding workflow logic directly into application code.

## Features

-   Configurable workflow definitions
-   Workflow instances
-   State-based transitions
-   Transition validation
-   Conditional transition rules
-   Transition actions
-   Persistent SQLite storage
-   Audit history
-   State recovery after application restart
-   HTTP API
-   TypeScript type safety
-   Automated unit and API tests

## Architecture

    HTTP API
        ↓
    Fastify Server
        ↓
    Workflow Engine
       ↙       ↘
    Workflow    State
    Rules       Management
       ↘       ↙
      SQLite Database
       ↙          ↘
    Instances    History

The execution flow is:

    Workflow Definition
            ↓
    Create Instance
            ↓
    Validate Transition
            ↓
    Evaluate Rule
            ↓
    Change State
            ↓
    Execute Action
            ↓
    Persist State
            ↓
    Record History

## Example Workflow

The repository includes a purchase request workflow:

    Submitted
        │
        ▼
    Under Review
       /      \
      /        \
    Rejected   Approved
                  │
                  ▼
              Fulfillment
                  │
                  ▼
              Completed

The engine itself is not tied to purchase requests. The example
demonstrates how an application can define its own workflow.

## HTTP API

The application exposes a REST-style HTTP API.

### Health Check

    GET /health

Example response:

    {
      "status": "ok"
    }

### Register a Workflow

    POST /workflows

Example request:

    {
      "id": "approval",
      "name": "Approval Workflow",
      "initialState": "submitted",
      "states": [
        {
          "id": "submitted",
          "name": "Submitted"
        },
        {
          "id": "approved",
          "name": "Approved"
        }
      ],
      "transitions": [
        {
          "id": "approve",
          "from": "submitted",
          "to": "approved"
        }
      ]
    }

### Create a Workflow Instance

    POST /instances

Example request:

    {
      "workflowId": "approval",
      "instanceId": "REQ-1001"
    }

### Execute a Transition

    POST /instances/:id/transitions

Example request:

    {
      "transitionId": "approve"
    }

### Retrieve an Instance

    GET /instances/:id

### Retrieve Instance History

    GET /instances/:id/history

## Persistence

Workflow definitions, instances, state changes, and transition history
are persisted using SQLite.

The application restores persisted workflows, instances, and history
when it starts.

This means workflow state survives an application restart.

The local SQLite database is intentionally excluded from version
control.

## Validation

Workflow definitions are validated before registration.

The API rejects invalid definitions such as:

-   Missing required workflow properties
-   Empty state definitions
-   Invalid initial states
-   Transitions referencing unknown states
-   Invalid transition structures

This keeps malformed workflow definitions from entering the engine.

## Testing

The project uses Vitest for automated testing.

Run the complete test suite:

    npm test

The test suite covers both the core workflow engine and the HTTP API.

Current coverage includes:

-   Instance creation
-   Initial state handling
-   Valid transitions
-   Invalid transitions
-   Transition rules
-   Transition actions
-   Instance retrieval
-   Transition history
-   API workflow registration
-   API instance creation
-   API transitions
-   API history retrieval
-   Invalid API requests
-   Invalid workflow definitions
-   Workflow state validation

## Running Locally

### Requirements

-   Node.js
-   npm

### Install Dependencies

    npm install

### Run Tests

    npm test

### Run the Example

    npx tsx src/examples/purchase-request.ts

### Start the HTTP API

    npx tsx src/server.ts

The API will be available at:

    http://127.0.0.1:3000

## Project Structure

    workflow-engine/
    ├── src/
    │   ├── database.ts
    │   ├── engine.test.ts
    │   ├── index.ts
    │   ├── server.test.ts
    │   ├── server.ts
    │   └── examples/
    │       └── purchase-request.ts
    ├── .gitignore
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    └── README.md

### Core Components

**`src/index.ts`**

Contains the workflow engine and core domain types.

**`src/database.ts`**

Provides SQLite persistence for workflow definitions, instances, and
transition history.

**`src/server.ts`**

Exposes the workflow engine through a Fastify HTTP API.

**`src/engine.test.ts`**

Tests the core workflow engine behavior.

**`src/server.test.ts`**

Tests the HTTP API using isolated in-memory SQLite databases.

**`src/examples/purchase-request.ts`**

Demonstrates a complete workflow execution.

## Design Goals

The project focuses on several backend engineering concerns:

-   Explicit state transitions
-   Business rule enforcement
-   Deterministic workflow behavior
-   Persistent application state
-   Auditability
-   Testability
-   Separation between domain logic and transport
-   Type-safe implementation

## Project Status

The project currently provides a persistent workflow engine with a
REST-style HTTP API, SQLite storage, validation, audit history, and
automated tests.

Future development may include additional persistence abstractions,
event integration, authentication, and more advanced workflow
capabilities.
