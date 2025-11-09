import ItineraryCard from '../components/ItineraryCard';
import { itineraryItems } from '../mock/data';

function TripPlannerPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Trip planning studio</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Design every journey with precision.</h1>
        </div>
        <div className="rounded-full border border-slate-800 bg-slate-900/70 px-5 py-3 text-sm text-slate-300">
          Advanced filters, AI guidance, and dynamic itinerary previews.
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
            <h2 className="text-xl font-semibold text-white">Trip summary</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Destination</p>
                <p className="mt-2 text-xl font-semibold text-white">Santorini, Greece</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Budget</p>
                <p className="mt-2 text-xl font-semibold text-white">€1,100</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Itinerary builder</h2>
                <p className="mt-2 text-slate-400">Use AI prompts to tweak activities by travel style and duration.</p>
              </div>
              <button className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
                Recalculate
              </button>
            </div>
            <div className="mt-6 space-y-4">
              {itineraryItems.map((item) => (
                <ItineraryCard key={item.id} day={item.day} title={item.title} details={item.details} />
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-soft">
          <h2 className="text-xl font-semibold text-white">Activity search</h2>
          <p className="mt-3 text-slate-400">Find the best hotels, tours, and local experiences by category.</p>
          <div className="mt-6 space-y-4">
            <input
              type="search"
              placeholder="Search hotels, tours or destinations"
              className="w-full rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {['Price', 'Rating', 'Date', 'Category'].map((label) => (
                <button
                  key={label}
                  className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left text-slate-200 transition hover:border-cyan-400"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default TripPlannerPage;
