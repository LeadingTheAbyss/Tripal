# Ghumi-Ghumi (Tripal) - Premium Travel Itinerary Planner

## 🎯 What is the Purpose?
Ghumi-Ghumi (also known as Tripal) is an advanced, full-stack travel itinerary planner designed to remove the friction from planning trips. Instead of keeping a million tabs open for flights, trains, hotels, and attractions, this platform consolidates everything into a single, seamless, and visually stunning experience.

It takes user preferences—such as source, destination, travel dates, passenger details, and a total budget—and generates a highly optimized, fully ranked itinerary. It intelligently calculates the best transport modes, fetches real-time places of interest, retrieves live images, and even provides AI-driven recommendations based on the travel group's profile.

---

## ✨ What Features Are There?
The project is packed with dynamic, real-time, and interactive features:

1. **Premium 3D Animated Landing Experience:**
   - Utilizes GSAP scroll triggers and Three.js for a highly interactive, parallax-driven 3D airplane flight simulation on the homepage.
2. **Real-Time Transport Aggregation:**
   - Simultaneously fetches and ranks Flights, Trains, Buses, and Cabs using parallel asynchronous requests.
   - Calculates comfort, safety, and recommendation scores for every transport option.
3. **Live Train Tracking & Routes:**
   - Dedicated API routes to fetch live train statuses, station boards, and real-time routes.
4. **Dynamic Place Discovery & Ranking:**
   - Discovers places using live geospatial APIs (like Overpass API).
   - Dynamically ranks places based on real-time factors: Weather (Sunny, Rainy, etc.), Safety scores, and Crowd estimates.
   - Automatically fetches real images for these places concurrently using DuckDuckGo image search.
5. **Smart Hotel Recommendations:**
   - Ranks hotels based on distance to destination clusters, price per night, safety, and comfort.
6. **AI-Powered Recommendations:**
   - Integrates with local LLMs (via Ollama) to generate customized recommendations based on the passenger group (e.g., family vs. solo) and budget constraints.
7. **Interactive Itinerary Builder:**
   - Features a drag-and-drop UI (using `dnd-kit`) to let users manually adjust their travel timelines.
8. **Live Budget Tracking ("The Purse"):**
   - Real-time budget simulation that subtracts transport, place entry fees, and hotel costs from the user's total budget as they plan.

---

## 🛠️ What Technologies Are Used?

The project employs a modern, bleeding-edge tech stack separated into a robust backend and a highly interactive frontend.

### Frontend Technologies:
- **Core Framework:** Next.js (v16.2.9) with App Router, React 19, and TypeScript.
- **Styling & UI:** Tailwind CSS v4, Shadcn UI, and Base UI for highly customizable, accessible components.
- **Animations & 3D:** GSAP (GreenSock) for complex scroll animations and parallax effects, Three.js for rendering the 3D airplane, and Framer Motion for micro-interactions.
- **State Management:** Zustand for global state (like managing "The Purse" and selected trip items).
- **Forms & Validation:** React Hook Form coupled with Zod for strict schema validation.
- **Interactivity:** `@dnd-kit` for drag-and-drop itinerary management, React Query for frontend data fetching and caching.

### Backend Technologies:
- **Core Framework:** FastAPI (Python) running on Uvicorn for ultra-fast, asynchronous API handling.
- **Concurrency:** Extensive use of Python's `asyncio` (`asyncio.gather`, `asyncio.to_thread`) to parallelize heavy network I/O tasks (like fetching transport and images simultaneously).
- **Database & Caching:** Prisma ORM for database schemas, PostgreSQL (accessed via `asyncpg`), and Upstash Redis for caching live API responses.
- **AI Integration:** Ollama Engine for localized, cost-effective LLM processing.
- **External Data Sources:** Overpass API for geographic data, various live transport APIs, and image scraping services.

---

## 🔧 How Do We Fix It? (Common Architecture & UI Fixes)

During development, several complex issues typically arise that require specific architectural fixes:

### 1. I/O Bottlenecks in the Backend
**The Problem:** Fetching flights, trains, buses, and live place images sequentially takes too long, resulting in severe API latency.
**The Fix:** We completely eliminated sequential blocking by refactoring the backend to use Python's `asyncio.gather()`. This creates a Fan-Out/Fan-In architecture where all external API requests (e.g., fetching 20 place images) are dispatched simultaneously in parallel, dramatically cutting down response times without needing heavy message brokers like Celery.

### 2. GSAP Parallax Stacking Contexts (Z-Index Issues)
**The Problem:** Complex scroll animations often result in elements washing out or hiding behind others. For example, a parallax sky background with clouds might render *in front of* the main text, making the text invisible.
**The Fix:** GSAP `transform` animations create new CSS stacking contexts. To fix this, you must explicitly force the text containers to jump out of the local stacking context by using `position: relative` combined with a high `z-index` (e.g., `z-50`). Furthermore, forcing text colors via inline styles (`style={{ color: 'black' }}`) ensures they bypass any conflicting CSS frameworks or dark-mode overrides (like Shadcn's ThemeProvider or browser extensions like Dark Reader).

### 3. Tailwind v4 and Dynamic Overrides
**The Problem:** Tailwind arbitrary values (like `text-[#151515]`) sometimes conflict with global CSS files or Next.js themes.
**The Fix:** For critical UI elements in GSAP animations, bypassing the CSS compiler using raw inline React styles is the most foolproof method. Always ensure `globals.css` uses `@layer base` properly to avoid specificity wars.
