# FinSure: AI-Powered Financial Stability & Risk Intelligence Platform

**FinSure** is a full-stack, AI-driven financial tracking and prediction dashboard engineered to process daily bank transactions, strictly calculate predictive spending runways, and proactively flag anomaly expenditures using machine learning algorithms.

---

## ⚡ Tech Stack

*   **Frontend Client:** React.js, React Router, CSS Variables (Custom Design System)
*   **Backend Server:** FastAPI, Python, Uvicorn (ASGI)
*   **Database:** MongoDB Atlas (Motor Asyncio Engine)
*   **Machine Learning:** Scikit-learn (Isolation Forests), Prophet, Pandas, Numpy
*   **Authentication:** Passlib (bcrypt), python-jose (JWT Bearer Tokens)
*   **Background Jobs:** APScheduler
*   **Cloud Deployment:** Vercel (React) and Render (FastAPI)

---

## 🚀 Key Features & Functionalities

### 1. Robust Security & Authentication
*   **Military-Grade JWT Tokens:** Secure stateless authorization system preventing cookie-based CSRF attacks.
*   **BCrypt Hashing:** Passwords are cryptographically salted and hashed before ever touching the MongoDB cluster, protecting against rainbow table attacks.
*   **Strict CORS Policy:** Cloud topology securely locks the backend from unauthorized remote domains.

### 2. Live Financial Dashboard & Runways
*   **Real-Time Balance Calculations:** Dynamically aggregates income and expenses across highly-structured time cycles.
*   **Runway Forecaster:** Calculates daily burn rates against current savings to mathematically forecast exactly how many months of security the user possesses.
*   **Spending Velocity Indicators:** Real-time UI progress bars projecting percentage to budget limits based on historical averages.

### 3. Transaction Data Engineering
*   **Dual-Input Streams:** Supports rapid manual UI entry modals, as well as highly-scalable raw CSV bulk parsing utilizing Pandas.
*   **Event-Driven Pipeline:** Background hooks instantly execute budget recalculations and re-evaluate category risk scores upon every new inserted transaction.

### 4. Machine Learning Anomaly Detection
*   **Automated Risk Modeling:** Background schedulers train user-specific Isolation Forests and Prophet models isolated against individual category histories.
*   **Real-Time Flagging:** Newly ingested transactions are fed through the active pipeline and flagged as "Anomalies" if they break standard volatility ranges.

### 5. Premium UI/UX Engineering
*   **Collapsible App Navigation:** Space-optimized, dynamic sidebar utilizing CSS transitions.
*   **Animated Modal Portals:** Responsive popups built using React `createPortal` to bypass CSS ancestor Stacking Context limits.
*   **Interactive App Tour:** Native onboarding module built into the DOM overlay to softly dictate UX flow for initial registrations.

---

## 🏗️ Backend System Architecture

The core server follows an aggressive MVC/Service-Repository structural pattern for hyper-scalability:

*   **`main.py`**: The Uvicorn entrypoint handling CORS middleware, Rate Limiting, and the active Lifespan Context Manager.
*   **`app/api/`**: 
    *   `/endpoints/auth.py`: Registration, Login, and JWT refreshing.
    *   `/endpoints/transactions.py`: CRUD logic + CSV ingestion streams.
    *   `/endpoints/calendar.py`: EMI, subscription tracking, and payment alerts.
*   **`app/services/`**: The hardcore business logic executing database calls isolated apart from the API.
*   **`app/core/`**: Environment configurations leveraging `pydantic-settings` to strictly type-enforce `.env` files dynamically.
*   **`app/background/`**: Isolated cron jobs running via APScheduler to retrain ML weights without blocking public API HTTP traffic.

---

## 🎨 Frontend System Architecture

*   **`src/components/layout/`**: `AuthenticatedShell`, `Navbar`, and `Sidebar` structurally wrapper components managing absolute global positioning.
*   **`src/pages/`**: Massive isolated root views (`Dashboard.js`, `Transactions.js`, `Settings.js`) dynamically fetching their own localized data using encapsulated custom `useHooks`.
*   **`src/store/`**: Global Authentication stores dictating deep-linking access blocks and user caching.
*   **`src/lib/api.js`**: Reusable Axios instances automatically intercepting 401 Unauthorized codes to trigger silent background JWT refreshes without breaking user workflow.

## 🧭 User Dashboard & Sidebar Features

The application is structured around a collapsible sidebar, giving users seamless access to the following core functionalities:

*   **Dashboard**: The primary command center. Displays top-level metrics like Gross Cash and Total Debts, calculates exact Runway Month Forecasts, and renders real-time Spending Velocity charts alongside urgent Machine Learning Anomaly flags.
*   **Transactions**: A robust data grid for managing daily expenses. Users can filter by date range, search by text, or explicitly toggle anomaly-only views. It also houses a bulk-upload feature that parses massive CSV bank statements natively.
*   **Safety Net**: A specialized analytics view evaluating the underlying structural risk of the user's specific cash flow mapping. It generates a customized algorithmic health score out of 100 pointing towards complete financial security.
*   **Budget & Spending**: Allows users to explicitly set hard monthly spending limits for categories (e.g., "Entertainment"). It renders smooth progress bars that dynamically turn red the moment expenditures breach the set target.
*   **EMI Tracker**: Specifically isolates and tracks high-priority loan installments, providing a clear amortization overview to ensure the user never misses a crucial payment window.
*   **Axe Subscriptions**: A dedicated view targeting recurring "leakage" expenses like Netflix, Spotify, or Gym memberships, actively alerting users of unused recurring charges to help them cleanly sever unwanted costs.
*   **Calendar**: Explodes all upcoming EMIs and automated bill charges into an interactive, visual chronological timeline. This directly powers the red "Due Today" bell icon alerts in the global Navbar.
*   **AI Insights**: A deep analytics machine-learning engine that mathematically aggregates historical cash flow data, mapping spending habits to pinpoint exactly where money is leaking over time.
*   **Settings**: Controls global system overrides. Users can update their Profile, swap their primary default Currency (INR, USD, EUR, GBP), tweak their baseline Financial Goals, or access the Danger Zone to permanently wipe their data perfectly.

---

## 🌍 CI/CD Deployment Flow

1.  **Version Control:** Hosted publicly on GitHub utilizing `.gitignore` structures to prevent `.env` secrets leakage.
2.  **Render Backend:** Web Service explicitly tied to `backend/**` build triggers executing `pip install -r requirements.txt`. Includes zero-database `/api/v1/health` heartbeat routes to actively bypass 15-minute free-tier spin-down limitations.
3.  **Vercel Frontend:** Continuously deployed Create React App utilizing injected `REACT_APP_API_URL` environment structures and `CI=false` strict suppression techniques for seamless UI compiling. 
