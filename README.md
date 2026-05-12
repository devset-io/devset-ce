# Devset

**Free, self-hosted scenario engine for testing and simulating Kafka and RabbitMQ event-driven systems.**

Testing event-driven systems is painful. You end up writing throwaway Java or Python scripts just to publish a few messages, integration tests are brittle and slow, multi-step scenarios require glue code nobody wants to maintain, and reproducing production issues locally means reverse-engineering payloads by hand.

Devset gives you a visual builder and a declarative DSL for event-driven scenarios. Send real messages to real brokers, chain multi-step flows with conditionals and loops, switch between JSON and Protobuf — all on your machine. Iterate in seconds instead of minutes.

- **No cloud.** Runs entirely on your machine.
- **No accounts.** Open the UI and start.
- **No telemetry.** Your scenarios stay local.

Think Postman or Cypress, but for Kafka and RabbitMQ instead of HTTP.

<sub>Source-available under FSL-1.1 — free for internal use, converts to Apache 2.0 after two years.</sub>

---

## What is Devset?

Devset is a scenario engine for event-driven systems. It compiles a declarative DSL into an executable plan that produces events to Kafka and RabbitMQ, with support for JSON and Protobuf serialization, conditional logic, repeat loops, stateful field expressions, and template resolution. A visual builder helps design scenarios, then run them against real brokers locally.

**Key features:**

- Declarative DSL for event-driven scenarios — JSON or Protobuf payloads
- Real messages to real Kafka and RabbitMQ brokers (not mocks)
- Visual scenario builder with the DSL as the source of truth
- Conditional emit, repeat loops, wait steps
- Stateful expressions and template resolution
- Schema registry support for Protobuf
- WebSocket streaming for live Kafka topic inspection
- SQLite persistence — zero external database dependencies
- Local-first — your data never leaves your machine

---

## Screenshots

### Code Editor
![Code Editor](docs/images/Code%20Editor.png)

### Flow Builder
![Flow Builder](docs/images/Flow%20Builder.png)

### Message Dispatch
![Message Dispatch](docs/images/Message%20Dispatch.png)

### Simulation
![Simulation](docs/images/simulate.png)

### Function Studio
![Function Studio](docs/images/Function%20Studio.png)

### Database Query
![Database Query](docs/images/Database%20query.png)

### Protobuf Support
![Protobuf Support](docs/images/proto.png)

---

## Repository structure

This is a monorepo containing all Devset components:

| Directory | Component | Stack |
|-----------|-----------|-------|
| `devset-ce-be/` | Backend (REST API + engine) | Java 25, Spring Boot, Gradle |
| `devset-ce-fe/` | Frontend (UI) | React 19, TypeScript, Vite |
| `landing-page/` | Landing page | Static site |

---

## Quick start

### Prerequisites

- **Java 25** (Eclipse Temurin recommended)
- **Node.js 20+** and npm
- **protoc 34.1** (for Protobuf schema compilation; bundled in Docker image)
- **Docker** (optional, for containerized deployment)

### Run locally (development)

**Backend:**

```bash
cd devset-ce-be
./gradlew build
./gradlew bootRun --args='--spring.profiles.active=dev'
```

Backend starts on **http://localhost:8082**.

**Frontend:**

```bash
cd devset-ce-fe
npm install
npm run dev
```

Frontend starts on **http://localhost:5173**.

### Run with Docker Compose (recommended)

The fastest way to get everything running — backend, Kafka, and RabbitMQ:

```bash
docker compose up
```

Open **http://localhost:8082** — the UI and API are served from the same port.
Kafka is available at `localhost:9092`, RabbitMQ management UI at `localhost:15672`.

> The compose file builds the backend image locally. Before running, build the frontend
> and bundle it into the backend JAR (see steps below).

### Build from source

The recommended deployment approach is to build the frontend as static files, place them
inside the backend's `static/` resources directory, and run a single JAR. This way Spring Boot
serves both the API and the UI from one process — no separate web server, no CORS issues,
one port.

#### 1. Build frontend static files

```bash
cd devset-ce-fe
npm install
npm run build
```

This produces a `dist/` directory with the compiled frontend.

#### 2. Copy static files into the backend

```bash
cp -r devset-ce-fe/dist/* devset-ce-be/src/main/resources/static/
```

#### 3. Build the backend JAR (with frontend bundled)

```bash
cd devset-ce-be
./gradlew bootJar
```

#### 4. Run with Docker

```bash
cd devset-ce-be
docker build -t devset-ce .
docker run -p 8082:8082 -v devset-data:/data devset-ce
```

Open **http://localhost:8082** — both the UI and the API are served from the same port.

#### Docker image details

The Docker image:
- Uses Eclipse Temurin JDK 25
- Bundles protoc 34.1 for Protobuf schema compilation
- Runs as a non-root `app` user
- Persists data to `/data` volume (SQLite database)
- Exposes port **8082**

---

## Configuration

Backend configuration is managed via `application.yml` and Spring profiles:

| Property | Default | Description |
|---|---|---|
| `server.port` | `8082` | HTTP server port |
| `spring.datasource.url` | `jdbc:sqlite:/data/devset.db` | SQLite database path |
| `devset.cors.allowed-origins` | `http://localhost:5173` | Comma-separated CORS origins |
| `devset.engine.max-active-runs` | `10` | Maximum concurrent scenario runs |
| `devset.engine.max-executions-per-run` | `10` | Maximum executions per single run |

---

## Running tests

```bash
# Backend — unit tests
cd devset-ce-be && ./gradlew test

# Backend — integration tests (requires Docker for Testcontainers)
cd devset-ce-be && ./gradlew integTest

# Frontend
cd devset-ce-fe && npm test
```

---

## License

Devset is source-available software licensed under the
[Functional Source License 1.1 (FSL-1.1-Apache-2.0)](LICENSE).

- You **can** use, modify, and self-host Devset for internal use, education, and research.
- You **cannot** offer it as a competing commercial product or service.
- After **2 years** from each release, that version automatically converts to [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0).

**TL;DR:** You can use Devset internally at your company without any restrictions. The only limitation applies if someone wanted to sell Devset (or its clone) as their own commercial product.

This is **not** an OSI-approved open-source license. See the full [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

To report a security vulnerability, see [SECURITY.md](SECURITY.md).
