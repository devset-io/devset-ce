# Contributing to Devset CE

Hi! Thanks for your interest in contributing. This is a solo / small-team
project, so the rules are simple.

## TL;DR

1. **Open an Issue** before starting work on anything bigger than a small fix
2. Fork, branch, write code, add tests
3. **Sign your commits** (`git commit -s`) — this is **required** (DCO, see below)
4. Open a Pull Request

---

## What's welcome

- Bug fixes — always
- Documentation — typo fixes, better examples
- Tests — adding coverage for existing functionality
- Security fixes — report privately first (see [SECURITY.md](SECURITY.md))
- Small improvements — refactoring, cleanup, performance

## What to discuss in an Issue first

- Larger features — so you don't waste time on something that doesn't fit the roadmap
- Architecture changes — breaking changes, new dependencies
- API changes — public contracts
- New large dependencies — they impact build size and security surface

## What I won't merge (most common rejection reasons)

- PRs without tests (unless it's purely documentation)
- PRs without `Signed-off-by` (DCO required)
- Reformatting the entire codebase unrelated to a substantive change
- Adding a dependency just for one feature that can be written in 10 lines
- Mixing multiple unrelated changes in a single PR
- Changes that break functionality for other users without prior discussion

**Don't take rejections personally.** This is a one-person project and I have
to balance accepting PRs against being able to maintain them long-term.

---

## Developer Certificate of Origin (DCO)

Instead of a complicated CLA, we use **DCO** — a lightweight version that
works through a signature in the commit message.

### What it means

Every commit in your PR must include a `Signed-off-by` line with your real
name and email:

```
Signed-off-by: Jane Doe <jane@example.com>
```

This is added automatically with the `-s` flag:

```bash
git commit -s -m "fix: handle null in user lookup"
```

### What you're signing

Full DCO text: https://developercertificate.org/

In short: you certify that you have the right to contribute this code (you
wrote it yourself, or have permission from your employer/another author) and
you agree that it will be released under the project's license
(FSL-1.1-Apache-2.0).

### Why DCO instead of CLA

- **DCO is lighter** — you don't have to sign anything beyond the commit
- **A CLA would require a CLA Assistant account, signing PDFs, etc.** —
  overkill for a small project
- **If we ever switch to a CLA**, we'll announce it well in advance

### What if I forget `-s`?

```bash
# For the most recent commit:
git commit --amend --signoff

# For multiple commits (e.g., last 3):
git rebase HEAD~3 --signoff

# Force push to your PR branch:
git push --force-with-lease
```

---

## Repository structure

This is a monorepo with two main components:

| Directory | Component | Stack |
|-----------|-----------|-------|
| `devset-ce-be/` | Backend | Java 25, Spring Boot, Gradle |
| `devset-ce-fe/` | Frontend | React 19, TypeScript, Vite |

Each component has its own build tooling. See component-level READMEs for
architecture details and development setup.

---

## Development setup

### Backend

**Requirements:** Java 25 (Eclipse Temurin recommended), Gradle 9.4+ (wrapper included), protoc 34.1

```bash
cd devset-ce-be
./gradlew build
./gradlew bootRun --args='--spring.profiles.active=dev'
```

### Frontend

**Requirements:** Node.js 20+, npm

```bash
cd devset-ce-fe
npm install
npm run dev
```

### Running tests

```bash
# Backend — unit tests
cd devset-ce-be && ./gradlew test

# Backend — integration tests (requires Docker for Testcontainers)
cd devset-ce-be && ./gradlew integTest

# Frontend
cd devset-ce-fe && npm test
```

---

## Code style

- **Backend:** Java 21+ with records, sealed classes, pattern matching. Onion Architecture. See `devset-ce-be/README.md`.
- **Frontend:** TypeScript strict mode, React 19 functional components, Tailwind CSS. See `devset-ce-fe/README.md`.

Stay **consistent with existing code**. If existing code violates these
rules, open an Issue first — don't reformat in feature PRs.

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user export endpoint
fix: handle null in session lookup
docs: explain DCO in CONTRIBUTING
test: add coverage for parser edge cases
refactor: extract validation into separate module
chore: bump dependencies
```

---

## Pull Request checklist

Before opening a PR, make sure:

- [ ] Branch is up to date with `main` (rebase, don't merge)
- [ ] All commits are signed (`git log` shows `Signed-off-by:` on each)
- [ ] Relevant builds pass (`./gradlew build` and/or `npm run build`)
- [ ] New code has tests (unless it's docs-only)
- [ ] Commit messages follow Conventional Commits
- [ ] PR description explains **what** and **why** (not just what)
- [ ] Linked to an Issue if one exists
- [ ] No secrets, API keys, or personal data in the diff
- [ ] No unrelated changes (split into separate PRs if needed)

## PR review process

- I aim to give first feedback within **7 days**, but I'm a solo dev — be patient
- Small PRs get reviewed faster than big ones
- I'll ask questions if something isn't clear; engage in good faith
- I may ask for changes; that's normal, not personal
- After approval, I usually squash-merge unless commits are well-structured

---

## Code of Conduct (light)

This is a small project, so no 20-page CoC:

- **Be kind.** Everyone is learning.
- **Assume good faith.** Write as if the other person is also doing their best.
- **Critique code, not people.** "This code has problem X" — OK. "You're
  stupid for writing this" — not OK.
- **No harassment, discrimination, or personal attacks.** I'll ban without
  warning.

---

## Recognition

Contributors are listed in:
- `CONTRIBUTORS.md` (if it exists) or auto-generated from git history
- Release notes for significant contributions

---

## Questions?

Open a [Discussion](https://github.com/devset-io/devset-ce/discussions)

Thanks for wanting to help!
