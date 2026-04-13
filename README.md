# Financial Accounting System — Monorepo

This repository contains the monorepo setup for a financial accounting platform. It focuses on clean structure, scalable architecture, and multi-service development.

---

# 🧱 Tech Stack

## Core

* Frontend: Next.js
* Backend: NestJS
* Worker: Node.js (BullMQ)
* Database: PostgreSQL (via Prisma)

## Tooling

* Monorepo: Turborepo
* Package Manager: pnpm
* Queue: BullMQ + Redis
* Containerization: Docker (planned)

---

# 📁 Folder Structure

```
root/
│
├── apps/
│   ├── web/        # Next.js frontend
│   ├── api/        # NestJS backend
│   └── worker/     # Background jobs (BullMQ)
│
├── packages/
│   ├── types/      # Shared types (DTOs, enums)
│   ├── utils/      # Common utilities
│   ├── database/   # Prisma schema & client
│   └── config/     # Env & constants
│
├── infra/
│   ├── docker/     # Docker configs
│   └── scripts/    # Deployment scripts
│
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── .env
```

---

# ⚙️ Local Setup

## 1. Prerequisites

* Node.js (>= 18)
* pnpm
* Docker (optional)

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Environment Setup

Create `.env` in root:

```
DATABASE_URL=
REDIS_URL=
NEXT_PUBLIC_API_URL=
```

## 4. Run Development

```bash
pnpm dev
```

This runs all apps via Turborepo.

---

# 📌 Notes

* This repository is under active development
* Structure and modules will evolve over time

---
