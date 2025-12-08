function LandingPage() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.2),_transparent_40%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="max-w-3xl space-y-8">
          <div className="space-y-6">
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              TravelMate AI — intelligent travel planning for modern explorers.
            </h1>
            <p className="text-xl text-slate-300">
              Plan trips, build itineraries, share expenses, and book experiences in a unified platform built for teams, groups, and travel startups.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-300">
              Explore dashboard
            </a>
            <a href="/planner" className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-base text-slate-200 transition hover:border-slate-500">
              Start planning
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingPage;
