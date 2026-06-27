export type Destination = {
  id: string;
  name: string;
  location: string;
  rating: number;
  category: string;
  price: string;
  description: string;
};

export type Itinerary = {
  id: string;
  day: number;
  title: string;
  details: string;
};

export type Booking = {
  id: string;
  type: string;
  title: string;
  status: string;
  date: string;
  amount: string;
  location: string;
  details: string;
};

export type Expense = {
  id: string;
  label: string;
  category: string;
  date: string;
  amount: string;
  status: string;
};

export type ChatMessage = {
  id: string;
  sender: string;
  message: string;
  time: string;
  isGuide?: boolean;
};
