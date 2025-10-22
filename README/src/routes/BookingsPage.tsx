import { bookings } from '../mock/data';

function BookingsPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Booking management</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Track reservations and approvals.</h1>
        </div>
        <button className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
          New booking
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="space-y-6">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{booking.type}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{booking.title}</h2>
                </div>
                <div className="space-x-2 text-sm">
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-300">{booking.status}</span>
                  <span className="rounded-full bg-slate-950/80 px-3 py-1 text-slate-200">{booking.date}</span>
                </div>
              </div>
              <p className="mt-4 text-slate-400">{booking.details}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span>{booking.amount}</span>
                <span className="text-slate-500">•</span>
                <span>{booking.location}</span>
              </div>
            </article>
          ))}
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-white">Booking summary</h2>
          <p className="mt-3 text-slate-400">Review approved reservations, pending confirmations, and live payment status.</p>
          <div className="mt-6 space-y-4 text-slate-300">
            <div className="rounded-3xl bg-slate-950/70 p-4">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Pending approval</p>
              <p className="mt-2 text-lg font-semibold text-white">2 bookings</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-4">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Total committed</p>
              <p className="mt-2 text-lg font-semibold text-white">€9,650</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default BookingsPage;
