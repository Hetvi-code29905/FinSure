# Finomous: AI-Powered Financial Stability & Risk Intelligence Platform

**Finomous** is a full-stack, AI-driven financial tracking and prediction dashboard engineered to process daily bank transactions, strictly calculate predictive spending runways, and proactively flag anomaly expenditures using machine learning algorithms.

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

---

## 🌍 CI/CD Deployment Flow

1.  **Version Control:** Hosted publicly on GitHub utilizing `.gitignore` structures to prevent `.env` secrets leakage.
2.  **Render Backend:** Web Service explicitly tied to `backend/**` build triggers executing `pip install -r requirements.txt`. Includes zero-database `/api/v1/health` heartbeat routes to actively bypass 15-minute free-tier spin-down limitations.
3.  **Vercel Frontend:** Continuously deployed Create React App utilizing injected `REACT_APP_API_URL` environment structures and `CI=false` strict suppression techniques for seamless UI compiling. 
