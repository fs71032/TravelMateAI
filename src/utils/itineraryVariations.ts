function pickIndex(seed: number | undefined, day: number, count: number) {
  if (seed == null || !Number.isFinite(seed)) return (day - 1) % count;
  return Math.abs(Math.floor(seed / 1000) + day * 17) % count;
}

const DAY_TITLES = [
  'Arrival & first impressions',
  'Culture & landmarks',
  'Food & local markets',
  'Scenic walks & viewpoints',
  'Neighborhood discovery',
  'Hidden gems & day trip',
  'Slow morning & farewell'
];

const MORNING_ACTIVITIES = [
  'Start with a relaxed breakfast at a neighborhood café, then explore the historic center on foot.',
  'Visit a flagship museum or heritage site while crowds are still light.',
  'Join a guided walking tour to orient yourself with the city layout and main districts.',
  'Head to a local market for fresh produce, snacks, and people-watching.',
  'Take an early tram or metro ride to a viewpoint for panoramic photos.',
  'Browse independent shops and artisan studios in a creative quarter.',
  'Enjoy a slow morning stroll along the waterfront or main boulevard.'
];

const AFTERNOON_ACTIVITIES = [
  'Pause for lunch at a well-rated local spot, then continue with a short museum or gallery visit.',
  'Spend the afternoon in a lively district known for architecture, parks, or street life.',
  'Try a hands-on experience such as a cooking demo, craft workshop, or tasting session.',
  'Relax in a public garden or plaza before an optional short excursion nearby.',
  'Explore a secondary neighborhood that locals recommend for authentic atmosphere.',
  'Visit a cultural center or exhibition that matches your travel style.',
  'Keep the pace gentle with coffee breaks and flexible time for photos.'
];

const EVENING_ACTIVITIES = [
  'Finish with dinner at a traditional restaurant and an evening walk through illuminated streets.',
  'Catch sunset from a rooftop bar or scenic terrace, then enjoy a casual late meal.',
  'Sample street food or tapas-style small plates in a busy evening district.',
  'End the day with live music, a night market, or a quiet riverside promenade.',
  'Try a dessert specialty from a local bakery before heading back.',
  'Book a short evening activity such as a river cruise or cultural show if energy allows.',
  'Wind down with a relaxed dinner and early rest to stay fresh for the next day.'
];

const LOCAL_TIPS = [
  'Local tip: ask staff at your accommodation for same-day restaurant reservations.',
  'Local tip: buy transport day passes early to save time at ticket machines.',
  'Local tip: carry a reusable water bottle — many cities have public refill points.',
  'Local tip: learn two or three basic phrases; locals appreciate the effort.',
  'Local tip: visit popular sights right at opening time to avoid peak queues.',
  'Local tip: keep some cash for small vendors that may not accept cards.',
  'Local tip: save offline maps in case mobile signal drops in narrow streets.'
];

export function getVariantTitle(day: number, seed?: number) {
  const index = pickIndex(seed, day, DAY_TITLES.length);
  return `Day ${day}: ${DAY_TITLES[index]}`;
}

export function getVariantDetails(options: {
  day: number;
  destination: string;
  styleDesc: string;
  budgetNote?: string;
  focusNote?: string;
  seed?: number;
}) {
  const { day, destination, styleDesc, budgetNote, focusNote, seed } = options;
  const dest = destination.trim() || 'your destination';
  const styleLine = styleDesc ? ` Focus: ${styleDesc}.` : '';
  const morning = MORNING_ACTIVITIES[pickIndex(seed, day, MORNING_ACTIVITIES.length)];
  const afternoon = AFTERNOON_ACTIVITIES[pickIndex(seed, day + 3, AFTERNOON_ACTIVITIES.length)];
  const evening = EVENING_ACTIVITIES[pickIndex(seed, day + 5, EVENING_ACTIVITIES.length)];
  const tip = LOCAL_TIPS[pickIndex(seed, day + 7, LOCAL_TIPS.length)];

  return [
    `Morning: ${morning.replace('historic center', `${dest}'s historic center`)}`,
    `Afternoon: ${afternoon}`,
    `Evening: ${evening}`,
    tip,
    styleLine.trim(),
    budgetNote || '',
    focusNote || ''
  ]
    .filter(Boolean)
    .join(' ');
}
