# Project Overview

This is the monorepo for the PSC-AI platform - [https://www.reviewmyagent.today](https://www.reviewmyagent.today)

It contains two apps:
- **landing** — pre-launch sign-up page
- **platform** — the main PSC-AI platform (in development)

## Test The Project Locally

### Prerequisites

- [Node.js](https://nodejs.org) (v18 or higher)
- [npm](https://www.npmjs.com)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gentle-weapons/psc-ai.git
cd psc-ai
```

2. Install dependencies from the repo root:
```bash
npm install
```

3. Add local environment variables:

The fully deployed project uses Supabase and hCaptcha environment variables set in Railway.

To test the landing app locally, create a `.env.local` file inside `apps/landing/` and set the following environment variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_HCAPTCHA_SITE_KEY
- HCAPTCHA_SECRET_KEY

You'll need a Supabase project (unless using the actual team Supabase project). Once created, run the below SQL in the SQL Editor to set up the required table. You can find your environment variable values under Project Settings → API.

The following database schema is used:
```sql
CREATE TABLE public.emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL DEFAULT ''::text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  subscribed boolean DEFAULT true,
  role text DEFAULT ''::text,
  CONSTRAINT emails_pkey PRIMARY KEY (id)
);
```

4. Start the development servers:
```bash
npx turbo dev
```

This runs both apps in parallel:
- Landing → [http://localhost:3000](http://localhost:3000)
- Platform → [http://localhost:3001](http://localhost:3001)

To run a single app:
```bash
npx turbo dev --filter=@psc-ai/landing
npx turbo dev --filter=@psc-ai/platform
```

## Directory Structure
```
apps/
├── landing/                 # Pre-launch sign-up page
│   ├── app/
│   │   ├── page.js          # Home page (/)
│   │   ├── layout.js        # Root layout (wraps all pages)
│   │   ├── globals.css      # Global styles
│   │   └── [route]/
│   │       └── page.js      # Additional pages (/route)
│   ├── components/          # Custom React components
│   └── public/              # Static files (images, etc.)
│
└── platform/                # Main PSC-AI platform (in development)
    └── app/
        ├── page.js          # Home page (/)
        ├── layout.js        # Root layout (wraps all pages)
        ├── globals.css      # Global styles
        ├── consumer/
        │   └── page.js      # Consumer tab (/consumer)
        └── developer/
            └── page.js      # Developer tab (/developer)

turbo.json                   # Turborepo task configuration
package.json                 # Root package.json (workspaces)
```

## Tech Stack

### Turborepo
- Used for: Monorepo task orchestration and caching
- Official Turborepo Docs: https://turbo.build/repo/docs

### Next.js
- Used for: React framework providing routing, server-side rendering, and optimizations
- Official Next.js Docs: https://nextjs.org/docs

### React
- Used for: Building user interfaces and interactive components
- Official React Docs: https://react.dev/learn

### Supabase
- Used for: Authentication, database, and backend services
- Official Supabase Docs: https://supabase.com/docs

### Railway
- Used for: Hosting and deploying
- Official Railway Docs: https://docs.railway.com
