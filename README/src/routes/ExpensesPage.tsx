import { expenses } from '../mock/data';

function ExpensesPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Expense tracker</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Manage group spending and splits.</h1>
        </div>
        <button className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
          Add expense
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          {expenses.map((expense) => (
            <div key={expense.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{expense.category}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{expense.label}</h2>
                </div>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-300">{expense.status}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <span>{expense.amount}</span>
                <span className="text-slate-500">•</span>
                <span>{expense.date}</span>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-white">Expense insights</h2>
          <p className="mt-3 text-slate-400">Keep each travel group member aligned with split totals and forecasted budgets.</p>
          <div className="mt-6 space-y-4 text-slate-300">
            <div className="rounded-3xl bg-slate-950/70 p-4">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Forecasted variance</p>
              <p className="mt-2 text-lg font-semibold text-white">€380 below budget</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-4">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Split progress</p>
              <p className="mt-2 text-lg font-semibold text-white">78% settled</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default ExpensesPage;
