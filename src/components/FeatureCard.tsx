type FeatureCardProps = {
  title: string;
  description: string;
  accent: string;
};

function FeatureCard({ title, description, accent }: FeatureCardProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-soft">
      <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold text-slate-900 ${accent}`}>
        {title}
      </div>
      <p className="text-slate-300">{description}</p>
    </div>
  );
}

export default FeatureCard;
