import FeatureCard from '../components/FeatureCard';

const features = [
  { title: 'Real-Time Ops', description: 'Live chat, notifications, and booking updates without refresh.', accent: 'bg-cyan-200' },
  { title: 'AI Planner', description: 'Generate itineraries, budgets, and destination suggestions automatically.', accent: 'bg-fuchsia-200' },
  { title: 'Enterprise Ready', description: 'Modern dashboard, analytics, and group travel workflows.', accent: 'bg-amber-200' }
];

function LandingPage() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.2),_transparent_40%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
              Startup-grade travel planning with AI enhancements
            </div>
            <div className="max-w-2xl space-y-6">
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
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800/70 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
              <h2 className="text-lg font-semibold text-white">Live collaboration</h2>
              <p className="mt-3 text-slate-400">Keep travel groups aligned with chat, invitations, and status updates.</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
              <h2 className="text-lg font-semibold text-white">AI recommendations</h2>
              <p className="mt-3 text-slate-400">Use AI to generate budgets, itineraries, and curated destination suggestions.</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
              <h2 className="text-lg font-semibold text-white">Detailed insights</h2>
              <p className="mt-3 text-slate-400">Track trip performance and booking metrics from a polished analytics dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingPage;
