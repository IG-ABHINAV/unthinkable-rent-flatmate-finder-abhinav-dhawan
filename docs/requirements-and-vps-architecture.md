# Rent & Flatmate Finder - Consolidated Requirements and VPS Architecture

## Product scope

The application has three roles: tenant, owner, and admin. Owners manage room listings; tenants maintain preferences and browse active listings ranked by a cached compatibility score; admins moderate users and listings and view platform activity.

An interest request moves from pending to accepted or declined. A high-scoring request notifies the owner. An accepted request unlocks a private, persistent real-time chat. Accept and decline actions notify the tenant.

## VPS production topology

```text
Internet
   |
 HTTPS/WSS :443
   |
Nginx (TLS, static React files, reverse proxy)
   |--------------------------|
   | /                        | /api and /socket.io
React SPA                     Node API + Socket.IO
                              |
                              PostgreSQL (private Docker network)
                              |
                              OpenAI-compatible API + SMTP provider
```

All containers run through Docker Compose. Only ports 80 and 443 are public. PostgreSQL is not exposed to the internet. Nginx serves the compiled frontend, proxies REST calls, and preserves WebSocket upgrade headers. Persistent named volumes hold database data and TLS state.

## VPS baseline

- Ubuntu 24.04 LTS, 2 vCPU, 2-4 GB RAM, and at least 25 GB SSD.
- A domain with an A/AAAA record pointing at the VPS.
- Docker Engine with the Compose plugin.
- Firewall permitting SSH, HTTP, and HTTPS only.
- SSH keys only; disable password and root SSH login after initial setup.
- Automated PostgreSQL dumps copied off the VPS, plus provider snapshots where available.

## Application decisions

- TypeScript across React and Node reduces context switching and catches contract errors.
- Express and Socket.IO share one process and port, which is sufficient for assignment scale and keeps deployment simple.
- Prisma owns PostgreSQL schema and repeatable migrations.
- JWT authenticates REST and Socket.IO. Every mutation also checks role, resource ownership, or chat participation.
- Compatibility scores are unique per tenant/listing pair. Profile or listing edits invalidate related cached rows.
- The LLM must return validated JSON within a short timeout. Timeout, transport, parsing, or schema errors invoke the deterministic fallback.
- Notifications are written transactionally. Email is a best-effort side effect and can be retried without undoing the user's action.
- Listing photos use URL fields initially. Production uploads should use S3-compatible object storage rather than the API container filesystem.

## Delivery gates

1. Auth and RBAC tests pass.
2. Listing/profile validation and ownership tests pass.
3. LLM success and every fallback condition are tested.
4. Interest transitions are idempotent and authorization-tested.
5. Chat rejects non-participants and persists before broadcasting.
6. Production images build and Compose health checks pass.
7. HTTPS, WebSocket reconnect, database restore, and email failure are smoke-tested on the VPS.
8. README includes setup, environment variables, API reference, schema, prompt I/O, deployment, and the <=800-word design write-up.

## Submission compliance

The public GitHub repository uses `main`. Secrets, dependencies, build output, editor files, temporary files, and database dumps remain ignored. The repository contains only source, lockfile, migrations, tests, deployment definitions, and documentation.
