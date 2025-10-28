import { destinations } from '../mock/data';

function DestinationsPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Destination discovery</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Curated places for every travel style.</h1>
        </div>
        <button className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
          Browse all destinations
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {destinations.map((destination) => (
          <article key={destination.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{destination.category}</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{destination.name}</h2>
              </div>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-semibold text-cyan-300">{destination.price}</span>
            </div>
            <p className="text-slate-400">{destination.location}</p>
            <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
              <span>{destination.rating} ★</span>
              <button className="rounded-full border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs transition hover:border-cyan-400">
                Save
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DestinationsPage;
