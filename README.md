# Lilly's app

A family chore and rewards app — chores kids actually want to do.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** [Supabase](https://supabase.com) (Postgres, Auth, Storage, Edge Functions)

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a [Supabase project](https://supabase.com/dashboard) (or run locally with `npx supabase start`).

3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Apply the database migration:

```bash
npx supabase db push
```

   Or run the SQL in `supabase/migrations/20260813000000_initial_schema.sql` against your project.

5. Deploy edge functions (optional, for AI features):

```bash
npx supabase functions deploy invoke-llm
npx supabase functions deploy chore-coach
npx supabase functions deploy verify-chore-photos
npx supabase functions deploy pay-allowances
```

   Set `OPENAI_API_KEY` in your Supabase project secrets for AI-powered features.

6. Start the dev server:

```bash
npm run dev
```

## Features

- Parent dashboard — create chores, approve submissions, manage allowances
- Kid experience — claim chores, earn rewards, shop, streaks, badges
- Family chat and quest system
- AI Chore Coach (with OpenAI)
- Photo verification for chore submissions

## Support

Contact: support@lillysapp.com
