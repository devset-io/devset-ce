# Devset CE — Frontend

**Local-first UI for testing Kafka & RabbitMQ message flows.**

Define → Send → Inspect → Repeat

---

## What is Devset CE?

Devset CE is a source-available, local-first UI for testing message-driven systems using Kafka and RabbitMQ. Without scripts. Without cloud. Without switching tools.

---

## Features

- Send real messages to Kafka & RabbitMQ
- Build workflows visually
- Transform payloads (no raw JSON pain)
- Replay and inspect executions
- Built-in documentation
- No data leaves your machine

---

## Core modules

| Module | Description |
|--------|------------|
| Message Dispatch | Send and replay messages |
| Flow Builder | Build multi-step workflows |
| Function Studio | Transform payloads with logic |
| Workflow Runs | Inspect execution results |
| Schema Repo | Manage event schemas |
| Playground | Test flows before execution |
| Settings | Configure brokers |

---

## Quick start

### 1. Install

```bash
npm install
```

### 2. Run

```bash
npm run dev
```

Open: http://localhost:5173

---

## Requirements

- **Node.js 20+** and npm
- Devset CE backend running on http://localhost:8082
- Kafka and/or RabbitMQ (optional)

---

## How it works

1. Define message (payload + headers)
2. Select broker (Kafka / RabbitMQ)
3. Send message
4. Inspect what your app did

---

## Project structure

```
src/              — application source code
src/docs/content/ — built-in documentation (EN + PL)
public/           — static assets
vite.config.ts    — build configuration
```

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build app |
| `npm run preview` | Preview build |
| `npm run lint` | Lint code |

---

## Build variables

- `VITE_UI_VERSION`
- `VITE_API_VERSION`
- `VITE_GIT_TAG`

---

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- XYFlow

---

## License

Devset CE is source-available software licensed under the
[Functional Source License 1.1 (FSL-1.1-Apache-2.0)](LICENSE).

- You **can** use, modify, and self-host Devset CE for internal use, education, and research.
- You **cannot** offer it as a competing commercial product or service.
- After **2 years** from each release, that version automatically converts to [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0).

This is **not** an OSI-approved open-source license. See the full [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

To report a security vulnerability, see [SECURITY.md](SECURITY.md).
