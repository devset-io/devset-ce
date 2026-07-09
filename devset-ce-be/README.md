# Devset CE — Backend

Devset CE is a source-available workflow engine for generating and sending structured events to Kafka and RabbitMQ. It compiles a declarative pipeline DSL into an executable plan that produces events with support for JSON and Protobuf serialization, conditional logic, repeat loops, and stateful field expressions.

## Features

- Declarative pipeline DSL compiled to an execution plan
- Kafka and RabbitMQ producer support with dynamic connector management
- JSON and Protobuf content types (with schema registry)
- Conditional emit, repeat loops (`repeatWhile` / `repeatUntil`), wait steps
- Stateful expressions (`$fn`, `$ref`) and template resolution
- Async run management with virtual threads
- WebSocket streaming for Kafka topic monitoring
- SQLite persistence (zero external database dependencies)
- REST API for workflow CRUD, execution, simulation, and connector management

## Requirements

- **Java 25** (Eclipse Temurin recommended)
- **Gradle 9.4+** (wrapper included)
- **protoc 34.1** (required for Protobuf schema compilation; bundled in Docker image)

## Quick Start

### Build

```bash
./gradlew build
```

### Run (development)

```bash
./gradlew bootRun --args='--spring.profiles.active=dev'
```

The application starts on **port 8082** by default.

### Run (Docker)

```bash
./gradlew bootJar
docker build -t devset-ce-be .
docker run -p 8082:8082 -v devset-data:/data devset-ce-be
```

### Run Tests

```bash
# Unit tests
./gradlew test

# Integration tests
./gradlew integTest
```

## Configuration

Configuration is managed via `application.yml` and Spring profiles. Key properties:

| Property | Default | Description |
|---|---|---|
| `server.port` | `8082` | HTTP server port |
| `spring.datasource.url` | `jdbc:sqlite:/data/devset.db` | SQLite database path |
| `devset.cors.allowed-origins` | `http://localhost:5173` | Comma-separated CORS origins |
| `devset.engine.max-active-runs` | `10` | Maximum concurrent workflow runs |
| `devset.engine.max-executions-per-run` | `10` | Maximum executions per single run |
| `devset.predefined-connections.*` | empty | Kafka/RabbitMQ/database connections created automatically at startup |

### Predefined connections

Connections created from the UI live in memory and are lost on restart. Declare
default connections under `devset.predefined-connections` (lists `kafka`, `rabbit`,
`databases`) to have them recreated at startup — see the commented example in
`src/main/resources/application.yml`. In Docker, mount a file containing only these
entries at `/app/application.yml`; Spring Boot merges it with the bundled
configuration. Credentials are optional and may reference environment variables
(`password: ${KAFKA_PASSWORD:}`). Failed entries are logged and skipped, so an
unreachable broker never blocks startup.

## Architecture

```
API Layer (REST Controllers, WebSocket)
    |
Application Layer (Facades, Services, Engine)
    |
    +-- Pipeline Compiler (DSL -> Execution Plan)
    +-- Execution Engine (Step Handlers)
    +-- Connector Management (Kafka / RabbitMQ)
    |
Domain Layer (Workflow, Stage, ExecutionPlan, State)
    |
Infrastructure (SQLite, Kafka Producer, RabbitMQ Producer)
```

The pipeline compiler transforms workflow DSL definitions into a flat sequence of typed execution steps. The engine executes these steps sequentially, mutating runtime state and producing events that are dispatched to the configured broker.

## Project Structure

```
src/main/java/io/devset/ce/be/
  collection/     Collection (workflow group) management
  common/         Shared domain models and enums
  config/         Spring configuration (CORS, Jackson, WebSocket)
  connector/      Dynamic broker connector API
  engine/         Execution engine, step handlers, run lifecycle
  kafka/          Kafka producer and topic streaming
  pipeline/       Pipeline DSL compiler
  rabbit/         RabbitMQ producer
  schema/         Protobuf schema registry
  singlerequest/  Single request execution
  singlestep/     Single step execution
  workflow/       Workflow CRUD and catalog
```

## License

Devset CE is source-available software licensed under the
[Functional Source License 1.1 (FSL-1.1-Apache-2.0)](LICENSE).

**What does this mean?**

- You **can** use, modify, and self-host Devset CE for internal use, education, and research.
- You **cannot** offer it as a competing commercial product or service.
- After **2 years** from each release, that version automatically converts to [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0).

This is **not** an OSI-approved open-source license. See the full [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

To report a security vulnerability, see [SECURITY.md](SECURITY.md).
