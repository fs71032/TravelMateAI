import StatsCard from '../components/StatsCard';
import { overviewStats } from '../mock/data';

function DashboardPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">TravelMate AI Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Overview of your travel operations</h1>
        </div>
        <div className="rounded-full border border-slate-800 bg-slate-900/70 px-5 py-3 text-sm text-slate-300">
          Active group planning, bookings, and AI suggestions are live.
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {overviewStats.map((stat) => (
          <StatsCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
          <h2 className="text-xl font-semibold text-white">Upcoming trips</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Paris • Group itinerary</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">5-day Paris immersion</h3>
                </div>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">3 seats left</span>
              </div>
              <p className="mt-4 text-slate-400">AI budget optimization, local guide access, and booking coordination for flights, hotels, and activities.</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Lisbon • Culture</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Weekend Lisbon city break</h3>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">Confirmed</span>
              </div>
              <p className="mt-4 text-slate-400">Smart itinerary builder with destination search, expense split tracking, and travel group chat.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-white">AI recommendation</h2>
            <p className="mt-3 text-slate-400">Generate a bespoke itinerary in seconds by destination and budget.</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Example prompt</p>
                <p className="mt-2 text-slate-200">Create a 5-day Lisbon trip for 4 people under €1,200 with local experiences and beach time.</p>
              </div>
              <button className="w-full rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
                Generate itinerary
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-white">Live notifications</h2>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>✔ Booking approved for Milan hotel</li>
              <li>✔ Guide accepted invitation for Rome group</li>
              <li>✔ Activity reminder: midnight museum tour</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
