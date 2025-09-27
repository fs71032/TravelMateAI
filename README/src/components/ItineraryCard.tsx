type ItineraryCardProps = {
  day: number;
  title: string;
  details: string;
};

function ItineraryCard({ day, title, details }: ItineraryCardProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-soft">
      <div className="mb-3 flex items-center gap-3 text-sm text-cyan-300">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
          {day}
        </span>
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      </div>
      <p className="text-slate-400">{details}</p>
    </div>
  );
}

export default ItineraryCard;
