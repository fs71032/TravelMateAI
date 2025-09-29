type StatsCardProps = {
  label: string;
  value: string;
};

function StatsCard({ label, value }: StatsCardProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-center">
      <p className="text-3xl font-semibold text-cyan-300">{value}</p>
      <p className="mt-3 text-sm text-slate-400">{label}</p>
    </div>
  );
}

export default StatsCard;
