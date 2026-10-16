# Project Overview

This is the monorepo for the PSC-AI platform - [https://www.reviewmyagent.today](https://www.reviewmyagent.today)

It contains two apps:
- **platform** — the main PSC-AI platform
- **landing** — pre-launch sign-up page (no longer in active development)

## Test The Project Locally

### Prerequisites

- [Node.js](https://nodejs.org) (v18 or higher)
- [npm](https://www.npmjs.com)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), for the platform's local database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/psc-ai-asu/psc-ai.git
cd psc-ai
```

2. Install dependencies from the repo root:
```bash
npm install
```

3. Set up the platform's local database and environment variables:

Follow the **First-Time Setup** in [`apps/platform/README.md`](apps/platform/README.md). It runs a local Supabase database with test data in Docker, so local development never touches the live database.

The deployed project's Supabase and hCaptcha environment variables are set in Railway. Never put production keys in a local `.env.local` file.

4. Start the platform app:
```bash
npx turbo dev --filter=@psc-ai/platform
```

The platform runs at [http://localhost:3001](http://localhost:3001).

`npx turbo dev` without the filter starts both apps (landing on [http://localhost:3000](http://localhost:3000)), but only the platform is set up for local development.

## Directory Structure
```
apps/
├── landing/                 # Pre-launch sign-up page (no longer in active development)
│   ├── app/
│   │   ├── page.js          # Home page (/)
│   │   ├── layout.js        # Root layout (wraps all pages)
│   │   ├── globals.css      # Global styles
│   │   └── [route]/
│   │       └── page.js      # Additional pages (/route)
│   ├── components/          # Custom React components
│   └── public/              # Static files (images, etc.)
│
└── platform/                # Main PSC-AI platform
    ├── app/
    │   ├── page.js          # Home page (/)
    │   ├── layout.js        # Root layout (wraps all pages)
    │   ├── globals.css      # Global styles
    │   ├── consumer/
    │   │   └── page.js      # Consumer tab (/consumer)
    │   └── developer/
    │       └── page.js      # Developer tab (/developer)
    └── supabase/            # Local database: config, migrations, seed data
                             # (see apps/platform/README.md)

turbo.json                   # Turborepo task configuration
package.json                 # Root package.json (workspaces)
```
