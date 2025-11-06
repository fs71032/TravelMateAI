function ReportsPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Analytics & reports</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Measure performance across trips.</h1>
        </div>
        <button className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
          Export reports
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
          <h2 className="text-xl font-semibold text-white">Travel performance</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-950/80 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Top destination</p>
              <p className="mt-3 text-2xl font-semibold text-white">Lisbon</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Spend trend</p>
              <p className="mt-3 text-2xl font-semibold text-white">+18% month over month</p>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-sm text-slate-400">Most visited categories</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Luxury', 'Adventure', 'Cultural', 'Eco'].map((tag) => (
                  <span key={tag} className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-sm text-slate-400">AI forecast</p>
              <p className="mt-3 text-slate-200">Budget recommendations suggest a 12% reduction in operational overspend for upcoming trips.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
            <h2 className="text-xl font-semibold text-white">Export data</h2>
            <p className="mt-3 text-slate-400">Download CSV, JSON, or Excel summaries for trips, expenses, and bookings.</p>
            <div className="mt-6 grid gap-3">
              {['Trips', 'Bookings', 'Expenses', 'Reports'].map((item) => (
                <button key={item} className="w-full rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left text-slate-200 transition hover:border-cyan-400">
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
            <h2 className="text-xl font-semibold text-white">Insights</h2>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• 72% of groups prefer AI-generated itineraries.</li>
              <li>• Expense split automation increases group compliance.</li>
              <li>• Real-time chat reduces planning delays by 37%.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReportsPage;
