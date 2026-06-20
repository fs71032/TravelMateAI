# TravelMate AI Frontend

Modern React frontend for the TravelMate AI platform.

## Features

- React + Vite + TypeScript
- Tailwind CSS styling
- React Router multi-page architecture
- Redux Toolkit for state management
- Landing page, dashboard, trip planner, destinations, live chat, and reports pages
- Mock data to demonstrate travel product flows

## Setup

1. Open `TravelMateAI` in your terminal.
2. Install dependencies:

```bash
npm install
```

3. Run the backend auth API:

```bash
cd backend
npm install
npm start
```

4. Run the frontend development server:

```bash
cd ..
npm run dev
```

5. Open the local URL shown in the terminal.

## Project structure

- `src/` — application source files
- `src/routes/` — page views
- `src/components/` — reusable UI components
- `src/store/` — Redux state
- `src/mock/` — static mock travel data

## Pages included

- Landing page
- Dashboard
- Trip Planner
- Bookings
- Expenses
- Destinations
- Reports
- Live chat
- Sign-in screen

## Login credentials for demo

- Email: `admin@travelmate.ai`
- Password: `Test1234`

## Next steps

- Connect the frontend to a backend API
- Add authentication and JWT support
- Implement real-time Socket.IO messaging
- Replace mock data with live travel service data
