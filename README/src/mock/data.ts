import type { Booking, ChatMessage, Destination, Expense, Itinerary } from '../types';

export const overviewStats = [
  { label: 'Trips planned', value: '32' },
  { label: 'Live groups', value: '14' },
  { label: 'AI itineraries', value: '79' },
  { label: 'Active guides', value: '21' }
];

export const bookings: Booking[] = [
  {
    id: 'b1',
    type: 'Hotel',
    title: 'Suite reservation in Barcelona',
    status: 'Confirmed',
    date: 'Jun 11 - Jun 15',
    amount: '€2,240',
    location: 'Barcelona, Spain',
    details: 'Premium city suite with breakfast and airport pickup.'
  },
  {
    id: 'b2',
    type: 'Flight',
    title: 'Round-trip flight to Reykjavik',
    status: 'Pending',
    date: 'Jul 02 - Jul 09',
    amount: '€1,760',
    location: 'Vienna → Reykjavik',
    details: 'Group fare with flexible baggage for 6 travelers.'
  },
  {
    id: 'b3',
    type: 'Experience',
    title: 'Sunset cruise on Amalfi coast',
    status: 'Confirmed',
    date: 'Aug 20',
    amount: '€980',
    location: 'Amalfi, Italy',
    details: 'Private boat with guide and dinner included.'
  }
];

export const expenses: Expense[] = [
  {
    id: 'e1',
    label: 'Group dinner at local tavern',
    category: 'Food & Drink',
    date: 'May 27',
    amount: '€560',
    status: 'Paid'
  },
  {
    id: 'e2',
    label: 'Guide fee for hiking day',
    category: 'Activities',
    date: 'May 28',
    amount: '€140',
    status: 'Pending'
  },
  {
    id: 'e3',
    label: 'Shared van transfer',
    category: 'Transport',
    date: 'May 29',
    amount: '€220',
    status: 'Paid'
  }
];

export const destinations: Destination[] = [
  {
    id: 'dest-1',
    name: 'Lisbon, Portugal',
    location: 'Portugal',
    rating: 4.9,
    category: 'City & Culture',
    price: '€820',
    description: 'Historic streets, rooftop bars, and riverside cafés for a premium city escape.'
  },
  {
    id: 'dest-2',
    name: 'Reykjavík, Iceland',
    location: 'Iceland',
    rating: 4.8,
    category: 'Adventure',
    price: '€1,150',
    description: 'Northern lights, glacier tours, and volcanic landscapes for the adventurous group.'
  },
  {
    id: 'dest-3',
    name: 'Amalfi Coast',
    location: 'Italy',
    rating: 4.9,
    category: 'Luxury',
    price: '€980',
    description: 'Coastal villas, sunset cruises, and gourmet dining along the Italian seaside.'
  }
];

export const itineraryItems: Itinerary[] = [
  { id: 'd1', day: 1, title: 'Arrival & welcome', details: 'City walking tour, lounge check-in, group dinner with local guide.' },
  { id: 'd2', day: 2, title: 'Cultural highlights', details: 'Museum pass, market visit, AI suggestions for hidden food streets.' },
  { id: 'd3', day: 3, title: 'Adventure day', details: 'Coastal hike, boat excursion, real-time weather-based route update.' }
];

export const chatMessages: ChatMessage[] = [
  { id: 'c1', sender: 'Guide Elena', message: 'Welcome to the group! I just updated the itinerary for day 2.', time: '09:12', isGuide: true },
  { id: 'c2', sender: 'Mirela', message: 'Thanks! Can we add a sunset cruise on day 3?', time: '09:15' },
  { id: 'c3', sender: 'Guide Elena', message: 'Absolutely — I’ll send a quote with live booking options.', time: '09:20', isGuide: true }
];
