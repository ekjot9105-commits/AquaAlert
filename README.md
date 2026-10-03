# AquaAlert AI

AquaAlert AI turns citizen observations into verified, location-aware environmental alerts and early warnings for urban water ecosystems.

## Tech Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS + Zustand + React Router + Framer Motion + R3F + Leaflet
- Backend: Python + FastAPI + SQLModel + SQLite

## Getting Started

1. **Install Node dependencies & Setup Python Environment**
   ```bash
   npm run install:all
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   # Update values in .env if needed
   ```

3. **Run the Application**
   ```bash
   npm run dev
   ```
   This will start both the Frontend (Vite) and the Backend (FastAPI).
   - Web App: http://localhost:5173
   - API Docs: http://localhost:8000/docs
