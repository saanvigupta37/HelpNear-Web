# HelpNear 🤝

> **Neighbours helping neighbours** — a community-based mutual aid platform where people post and accept small help requests in their local area. Free, real-time, no payments.

## What is HelpNear?

HelpNear is a full-stack **community mutual aid web application** that connects neighbours for small everyday tasks. Someone needs groceries picked up? A pet walked? A quick fix around the house? HelpNear lets them post a request — and a trusted neighbour can accept and help, all in real-time.

No payments. No complex sign-ups. Just community.

---

## Features

### Core
- **Post help requests** with type, duration, urgency, description and reason
- **Quick presets** — 🛒 Buy groceries, 📦 Carry items, 🐶 Walk pet, 🔧 Quick fix, 🚶 Walk with me
- **Community matching** — requests only visible to users in the same neighbourhood
- **Accept & complete** — helpers accept requests, complete them, earn trust points
- **Real-time updates** — all status changes propagate instantly via Supabase Realtime

### Chat
- **Bidirectional real-time chat** between requester and helper using Supabase Broadcast
- Chat history persists in the database
- Opens from both the Help Others tab (helper view) and Need Help tab (requester view)

### Profiles & Trust
- **Profile photo upload** to Supabase Storage
- **Level system** — 🌱 New Helper → 🤝 Trusted Helper → 🌟 Community Hero
- **Trusted badge** for users with 5+ completed helps
- **Clickable profiles** — tap any avatar or name to view their full profile

### UX
- **Dark glassmorphic UI** with animated gradient borders and micro-interactions
- **Mobile-first** with a fixed bottom navigation bar on small screens
- **Skeleton loaders** on all async data
- **Offline banner** — auto-detects connection loss
- **Keyboard shortcuts** — `N` new request, `⌘K` focus search, `Esc` close modals
- **Auto-expire** — requests expire after 1 hour automatically
- **Invite link** — one-click copy of app URL for sharing with neighbours
- **Daily banner** — shows how many people helped today in your community

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5 |
| Styling | Tailwind CSS 3.4 (dark glassmorphic theme) |
| Font | Plus Jakarta Sans |
| Routing | React Router DOM 6 |
| Backend / Auth | Supabase (PostgreSQL 15, Auth, Realtime, Storage) |
| Real-time Chat | Supabase Broadcast channels |
| Real-time Data | Supabase `postgres_changes` subscriptions |
| Avatar Storage | Supabase Storage (`avatars` bucket) |

---

## Project Structure

```
helpnear/
├── index.html                      # App entry, meta tags, favicon
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env                            # Supabase credentials (not committed)
└── src/
    ├── main.jsx
    ├── App.jsx                     # Routes + auth state + offline banner
    ├── index.css                   # Global styles, glassmorphic utilities, animations
    ├── lib/
    │   └── supabase.js             # Supabase client + incrementHelps helper
    ├── pages/
    │   ├── Landing.jsx             # Public landing page (Gen-Z dark design)
    │   ├── Login.jsx               # Email + password login
    │   ├── Signup.jsx              # Registration with location auto-detect
    │   ├── Safety.jsx              # Safety acknowledgement screen
    │   ├── Dashboard.jsx           # Main app — Need Help & Help Others tabs
    │   └── Profile.jsx             # User profile, stats, help history, avatar upload
    └── components/
        ├── Sidebar.jsx             # Desktop nav — Home, Community, Stats, Settings
        ├── RequestCard.jsx         # Request card with expiry timer, urgency badge
        ├── UserProfileModal.jsx    # Popup profile viewer (clickable from cards)
        ├── RequestDetailsModal.jsx # Full request detail view
        ├── CommunityModal.jsx      # Change community with location auto-detect
        ├── BottomBanner.jsx        # "X helped today" daily count banner
        ├── OfflineBanner.jsx       # Internet connection status indicator
        ├── EmptyState.jsx          # Illustrated empty states
        └── LoadingSkeleton.jsx     # Shimmer skeleton loaders
```

---

## Database Schema

```sql
-- 5 tables, all with Row Level Security enabled

profiles          -- extends auth.users
  id              UUID  PK (→ auth.users)
  full_name       TEXT  NOT NULL
  username        TEXT  UNIQUE NOT NULL
  community       TEXT  NOT NULL
  phone           TEXT
  bio             TEXT
  avatar_url      TEXT
  helps_completed INT   DEFAULT 0
  created_at      TIMESTAMPTZ

requests
  id              UUID  PK
  requester_id    UUID  FK → profiles
  helper_id       UUID  FK → profiles (nullable)
  help_type       TEXT  NOT NULL
  description     TEXT
  reason          TEXT
  duration        TEXT  NOT NULL
  urgency         TEXT  CHECK(low | medium | high)
  status          TEXT  CHECK(open | accepted | completed | cancelled)
  community       TEXT  NOT NULL
  expires_at      TIMESTAMPTZ NOT NULL
  updated_at      TIMESTAMPTZ

messages
  id              UUID  PK
  request_id      UUID  FK → requests
  sender_id       UUID  FK → profiles
  content         TEXT  NOT NULL
  created_at      TIMESTAMPTZ

notifications
  id              UUID  PK
  user_id         UUID  FK → profiles
  message         TEXT  NOT NULL
  is_read         BOOLEAN DEFAULT false
  created_at      TIMESTAMPTZ

-- storage.objects (avatars bucket)
  path            userId/timestamp.ext
  public URL via Supabase CDN
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/helpnear.git
cd helpnear
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon/public key** from Settings → API

### 4. Set up environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run the database schema

Open **SQL Editor** in your Supabase dashboard and run each block below one at a time.

**Block 1 — Core tables**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  community TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  helps_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Requests table
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  helper_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  help_type TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  duration TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','completed','cancelled')),
  community TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Block 2 — RPC function**

```sql
CREATE OR REPLACE FUNCTION public.increment_helps(user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET helps_completed = COALESCE(helps_completed, 0) + 1
  WHERE id = user_id;
$$;
```

**Block 3 — Triggers**

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full replica identity for accurate realtime UPDATE events
ALTER TABLE public.requests REPLICA IDENTITY FULL;
```

**Block 4 — Row Level Security**

```sql
-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Requests
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requests viewable by all" ON public.requests FOR SELECT USING (true);
CREATE POLICY "Users insert own requests" ON public.requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users update own or accepted requests" ON public.requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = helper_id);

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read messages" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users insert messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
```

**Block 5 — Realtime**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

**Block 6 — Avatar storage**

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
```

### 6. Run locally

```bash
npm run dev
```

App is live at `http://localhost:5173`

### 7. Build for production

```bash
npm run build
```

Output goes to `/dist`. Deploy to **Vercel**, **Netlify**, or any static host.

---

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

Set environment variables in the Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Netlify

```bash
npm run build
# drag and drop the /dist folder to netlify.com/drop
```

Add environment variables in Site Settings → Environment Variables.

---

## How It Works

```
User signs up → picks community → sees Safety screen → Dashboard

NEED HELP TAB                    HELP OTHERS TAB
┌─────────────────────┐         ┌─────────────────────┐
│ + New Request       │         │ Requests near you   │
│                     │         │                     │
│ [My open requests]  │         │ [Community requests]│
│  • Open   [Cancel]  │         │  • Open   [Accept]  │
│  • Accepted         │         │                     │
│    Helper: Jane ⭐  │         │ Currently Helping   │
│    [💬 Chat]        │         │  • [Chat][Done]     │
└─────────────────────┘         └─────────────────────┘
          ↕ real-time via Supabase postgres_changes
          ↕ chat via Supabase Broadcast channels
```

### Request Lifecycle

```
open → accepted → completed
  ↓
cancelled (by requester or auto-expire after 1 hour)
```

### Trust Levels

| Level | Helps Completed |
|---|---|
| 🌱 New Helper | 0 – 4 |
| 🤝 Trusted Helper | 5 – 19 |
| 🌟 Community Hero | 20+ |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `N` | Open new request form |
| `Esc` | Close any modal |
| `⌘K` / `Ctrl+K` | Focus search bar |

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public API key |

---

## Contributing

1. Fork the repo
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m 'Add your feature'`
4. Push to the branch — `git push origin feature/your-feature`
5. Open a Pull Request

---

## Roadmap

- [ ] Push notifications (Web Push API)
- [ ] Request photo attachments
- [ ] Community leaderboard
- [ ] Multi-language support
- [ ] Native mobile app (React Native)
- [ ] Moderator tools for community admins

---

## License

MIT — free to use, modify and distribute.

---

<div align="center">

Built with ❤️ for neighbours everywhere

**[Live Demo](help-near-web.vercel.app)** · **[Report a Bug](https://github.com/saanvigupta37/HelpNear-Web/issues)** · **[Request a Feature](https://github.com/saanvigupta37/HelpNear-Web/issues)**

</div>
