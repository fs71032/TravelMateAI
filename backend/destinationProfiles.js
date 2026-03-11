const { normalizeDestinationKey } = require('./destinationContext');

/** Curated real venues — used when OpenAI is unavailable or as prompt enrichment. */
const PROFILES = [
  {
    keys: ['lisbon', 'lisboa', 'lisbon portugal'],
    label: 'Lisbon, Portugal',
    transportTip: 'Use the Viva Viagem card (€0.62/ride) for metro, tram 28, and buses.',
    plans: {
      Balanced: [
        {
          title: 'Alfama & Baixa — arrival & orientation',
          details:
            '09:00–09:45 — Pastéis de Nata at Manteigaria (Rua do Loreto 2).\n' +
            '10:00–12:30 — Alfama on foot: Sé de Lisboa, Miradouro de Santa Luzia, Castelo de São Jorge (book tickets online).\n' +
            '12:45–14:00 — Lunch at Time Out Market (Av. 24 de Julho 49, Mercado da Ribeira).\n' +
            '15:00–17:00 — Baixa & Rossio: Praça do Comércio, Elevador de Santa Justa (view from Largo do Carmo is free).\n' +
            '19:30 — Dinner in Bairro Alto: Taberna da Rua das Flores (reserve ahead).\n' +
            'Local tip: Tram 28 is scenic but crowded after 10:00 — ride it early or walk Alfama instead.'
        },
        {
          title: 'Belém & riverfront icons',
          details:
            '09:00 — Pastéis de Belém (Rua de Belém 84) before queues form.\n' +
            '10:00–12:30 — Mosteiro dos Jerónimos & Padrão dos Descobrimentos (combined ticket saves time).\n' +
            '13:00 — Lunch at Pão Pão Queijo Queijo near Belém tower.\n' +
            '14:30–16:30 — MAAT museum exterior walk + Belém Tower photo stop.\n' +
            '17:00 — Sunset beer at LX Factory (Rua Rodrigues de Faria 103) creative district.\n' +
            '20:00 — Fado dinner at Clube de Fado (Alfama) — book 48h ahead.'
        },
        {
          title: 'Sintra day trip or city viewpoints',
          details:
            'Option A — Sintra (40 min train from Rossio): Palácio da Pena first (09:30 slot), Quinta da Regaleira afternoon.\n' +
            'Option B — Stay in Lisbon: Miradouro da Senhora do Monte, Jardim da Estrela, Calouste Gulbenkian Museum.\n' +
            '13:00 — Lunch: Cantinho do Avillez (Chiado) or A Brasileira for historic café culture.\n' +
            '16:00 — Shopping & tiles: Cortiço & Netos azulejo shop, Conserveira de Lisboa.\n' +
            '19:00 — Farewell dinner: Prado Mercearia (creative Portuguese tasting menu).\n' +
            'Local tip: If doing Sintra, wear layers — the palace sits 500m above sea level.'
        }
      ],
      Food: [
        {
          title: 'Mercados & petiscos',
          details:
            '09:30 — Coffee at Fabrica Coffee Roasters (Baixa).\n' +
            '10:30–12:00 — Mercado de Campo de Ourique tasting walk (presunto, queijo, ginjinha).\n' +
            '13:00 — Lunch: Cervejaria Ramiro (seafood; arrive at opening or reserve).\n' +
            '16:00 — Wine bar crawl in Príncipe Real: By The Wine, Red Frog.\n' +
            '20:30 — Dinner: Belcanto (2 Michelin stars) or affordable tasca Senhor Vinho.'
        },
        {
          title: 'Alfama flavors & fado',
          details:
            '08:30 — Breakfast bifana at Casa Guedes (São Bento).\n' +
            '11:00 — Cooking class or market tour in Mouraria with Tasty Tours Lisbon.\n' +
            '14:00 — Lunch: Zé da Mouraria (family-style Portuguese).\n' +
            '17:00 — Ginjinha at A Ginjinha (Largo São Domingos).\n' +
            '20:00 — Fado + dinner at Parreirinha de Alfama.'
        },
        {
          title: 'Belém sweets & riverside',
          details:
            '09:00 — Pastéis de Belém workshop viewing + warm pastries.\n' +
            '11:00 — Bacalhau lunch at Pateo de Belém.\n' +
            '15:00 — Craft beer at LX Factory: Landeau Chocolate for dessert.\n' +
            '19:00 — Petiscos crawl: Bairro do Avillez, Mini Bar, final stop at Pensão Amor.'
        }
      ],
      Culture: [
        {
          title: 'Museums & monarchy',
          details:
            '10:00 — Museu Nacional do Azulejo (Metro: Santa Apolónia).\n' +
            '12:30 — Lunch at O Faia (traditional).\n' +
            '14:30 — Palácio Nacional da Ajuda (western Lisbon, less crowded than Sintra).\n' +
            '17:00 — Centro Cultural de Belém exhibitions.\n' +
            '20:00 — Classical concert at Teatro Nacional de São Carlos (check schedule).'
        },
        {
          title: 'Age of Discoveries',
          details:
            '09:30 — Jerónimos Monastery detailed visit with audio guide.\n' +
            '12:00 — Maritime Museum (Pavilhão do Mar).\n' +
            '14:00 — Lunch in Belém.\n' +
            '16:00 — Coach Museum (Museu Nacional dos Coches) — unique royal collection.\n' +
            '19:00 — Sunset at Miradouro de São Pedro de Alcântara.'
        },
        {
          title: 'Contemporary Lisbon',
          details:
            '10:00 — MAAT + Central Tejo industrial architecture.\n' +
            '13:00 — Lunch at DeliDelux (Belém).\n' +
            '15:00 — Gulbenkian Museum & gardens.\n' +
            '18:00 — Street art walk in Mouraria with guided tour.\n' +
            '20:30 — Dinner in Chiado: Sacramento do Chiado.'
        }
      ]
    }
  },
  {
    keys: ['tirana', 'tirane', 'tirana shqiperi', 'tirana albania'],
    label: 'Tirana, Albania',
    transportTip: 'City center is walkable; use taxi apps (Speed Taxi, Patoko) for Dajti or airport.',
    plans: {
      Balanced: [
        {
          title: 'Skanderbeg & city core',
          details:
            '09:00 — Breakfast at Mon Chéri (Ish-Blloku).\n' +
            '10:00–12:00 — Skanderbeg Square, National History Museum, Et\'hem Bey Mosque.\n' +
            '12:30 — Lunch: Oda (traditional Albanian, reserve).\n' +
            '14:00 — Bunk\'Art 2 (anti-nuclear bunker museum) — allow 90 min.\n' +
            '17:00 — Dritan Hila Gallery or Pyramid of Tirana exterior walk.\n' +
            '20:00 — Dinner in Blloku: Sofra e Ariut or Era Villa.'
        },
        {
          title: 'Blloku & Mount Dajti',
          details:
            '09:30 — Coffee at Komiteti Kafe Muzeum (communist-era memorabilia café).\n' +
            '11:00 — Blloku neighborhood walk: former dictator district, boutique shops.\n' +
            '13:00 — Lunch: Serendipity (Ish-Blloku).\n' +
            '15:00 — Dajti Ekspres cable car to Mount Dajti (views over Tirana).\n' +
            '18:00 — Sunset drink at Sky Hotel Panoramic bar.\n' +
            '20:30 — Traditional dinner at Mullixhiu (farm-to-table Albanian).'
        },
        {
          title: 'Markets & local life',
          details:
            '08:00 — Pazari i Ri (New Bazaar) for fresh produce & raki tasting.\n' +
            '10:30 — House of Leaves (surveillance museum).\n' +
            '13:00 — Lunch at Valbone (byrek & qofte).\n' +
            '15:00 — Grand Park (Parku i Madh) lake walk.\n' +
            '19:00 — Farewell at Pireu Fish Restaurant (fresh seafood).'
        }
      ],
      Food: [
        {
          title: 'Tirana tasting day',
          details:
            '09:00 — Byrek at traditional bakery near Avni Rustemi square.\n' +
            '11:00 — Kafe at Mon Chéri.\n' +
            '13:00 — Tavë kosi & fërgesë at Oda.\n' +
            '16:00 — Craft beer at Birra Stela.\n' +
            '20:00 — Fine dining: Mullixhiu tasting menu.'
        }
      ],
      Culture: [
        {
          title: 'Communist heritage',
          details:
            '10:00 — Bunk\'Art 1 (mountain bunker — allow 2h, taxi recommended).\n' +
            '14:00 — Lunch in city.\n' +
            '16:00 — House of Leaves + National Gallery of Arts.\n' +
            '19:00 — Folklore evening (check Teatri Kombëtar schedule).'
        }
      ]
    }
  },
  {
    keys: ['pristina', 'prishtina', 'pristina kosovo', 'prishtine'],
    label: 'Pristina, Kosovo',
    transportTip: 'City center fits in one day on foot; taxis are inexpensive for Germia Park.',
    plans: {
      Balanced: [
        {
          title: 'NEWBORN & city landmarks',
          details:
            '09:30 — Coffee at Halfnote Jazz Club café.\n' +
            '10:00 — NEWBORN monument, Mother Teresa Boulevard walk.\n' +
            '11:30 — Imperial Mosque & Clock Tower (Sahat Kulla).\n' +
            '13:00 — Lunch: Home Restaurant (modern Balkan).\n' +
            '15:00 — Kosovo Museum + Ethnological Museum (both central).\n' +
            '17:00 — National Library (Brutalist architecture photo stop).\n' +
            '20:00 — Dinner: Pishat (traditional Kosovo grill).'
        },
        {
          title: 'Germia Park & cafés',
          details:
            '09:00 — Breakfast at Soma Book Station.\n' +
            '11:00 — Germia Park hike or picnic (15 min taxi).\n' +
            '14:00 — Lunch at Te Komit — City Center.\n' +
            '16:00 — Café crawl in Dardania district.\n' +
            '19:30 — Sunset at Bear Sanctuary viewing point (if day trip) or Prishtina Mall terrace.'
        }
      ],
      Food: [
        {
          title: 'Kosovo flavors',
          details:
            '10:00 — Burek at a local furna (traditional bakery).\n' +
            '13:00 — Flia experience (weekends) or qebapa at Pishat.\n' +
            '16:00 — Macchiato culture at Liburnia.\n' +
            '20:00 — Dinner: Baboon Hookah Lounge restaurant or Tiffany.'
        }
      ]
    }
  },
  {
    keys: ['saranda', 'sarande', 'saranda albania'],
    label: 'Saranda, Albania',
    transportTip: 'Rent a car or book tours for Ksamil/Butrint; town center is walkable.',
    plans: {
      Balanced: [
        {
          title: 'Waterfront & Lëkurësi Castle',
          details:
            '09:00 — Breakfast at Lekuresi Castle restaurant (views over Saranda Bay).\n' +
            '11:00 — Saranda promenade & Synagogue ruins (5th century).\n' +
            '13:00 — Seafood lunch at Mare Nostrum Cuisine.\n' +
            '15:00 — Mirror Beach or Monastery Beach (taxi 15 min).\n' +
            '19:00 — Sunset aperitivo on the promenade.'
        },
        {
          title: 'Butrint UNESCO day',
          details:
            '08:30 — Drive/tour to Butrint National Park (45 min) — Roman theatre, baptistery.\n' +
            '13:00 — Lunch in Ksamil village.\n' +
            '15:00 — Ksamil Islands swim (boat €5–10).\n' +
            '19:00 — Return to Saranda; dinner at Taverna Labëria.'
        }
      ],
      Relax: [
        {
          title: 'Coastal slow day',
          details:
            '10:00 — Paddboard or kayak from Saranda beach operators.\n' +
            '13:00 — Long lunch at Javeri.\n' +
            '16:00 — Siesta & promenade walk.\n' +
            '18:00 — Sunset at Lëkurësi Castle.'
        }
      ]
    }
  },
  {
    keys: ['reykjavik', 'reykjavik iceland', 'iceland'],
    label: 'Reykjavík, Iceland',
    transportTip: 'Walk downtown; book day tours for Golden Circle or South Coast.',
    plans: {
      Balanced: [
        {
          title: 'Downtown & Harpa',
          details:
            '09:00 — Brunch at Bergsson Mathús.\n' +
            '10:30 — Hallgrímskirkja tower (book time slot).\n' +
            '12:00 — Laugavegur shopping street walk.\n' +
            '13:30 — Lunch at Icelandic Street Food (fish stew).\n' +
            '15:00 — Harpa Concert Hall architecture tour.\n' +
            '17:00 — Sun Voyager sculpture & waterfront.\n' +
            '20:00 — Northern lights tour (winter) or midnight sun walk (summer).'
        },
        {
          title: 'Golden Circle tour',
          details:
            '08:00 — Golden Circle day tour: Þingvellir National Park, Geysir, Gullfoss waterfall.\n' +
            '13:00 — Lunch stop at Friðheimar tomato greenhouse restaurant.\n' +
            '18:00 — Return Reykjavík; relax at Sky Lagoon or local hot pools.'
        }
      ],
      Adventure: [
        {
          title: 'Glacier or volcano day',
          details:
            'Full-day tour: Sólheimajökull glacier hike OR Katla ice cave (seasonal).\n' +
            'Pack waterproof layers; tour includes safety gear.\n' +
            'Evening: warm up at Blue Lagoon (book timed entry).'
        }
      ]
    }
  },
  {
    keys: ['amalfi', 'amalfi coast', 'positano', 'sorrento'],
    label: 'Amalfi Coast, Italy',
    transportTip: 'SITA bus or ferry between towns; avoid driving in peak summer.',
    plans: {
      Balanced: [
        {
          title: 'Positano & Path of Gods',
          details:
            '08:30 — Ferry Sorrento → Positano.\n' +
            '10:00 — Positano beach & church of Santa Maria Assunta.\n' +
            '13:00 — Lunch: Chez Black or Da Adolfo (beach club).\n' +
            '15:30 — Path of the Gods hike (Bomerano to Nocelle) — 3h moderate.\n' +
            '19:00 — Aperitivo in Praiano.'
        },
        {
          title: 'Amalfi & Ravello',
          details:
            '09:00 — Amalfi Cathedral & paper museum.\n' +
            '12:00 — Lemon gelato at Andrea Pansa (Amalfi).\n' +
            '14:00 — Bus to Ravello: Villa Rufolo & Villa Cimbrone gardens.\n' +
            '19:00 — Dinner with view: Rossellinis (Ravello) or Lo Scoglio (Cetara).'
        }
      ],
      Relax: [
        {
          title: 'Coastal slow day',
          details:
            'Morning at Fornillo beach (Positano).\n' +
            'Afternoon spa at Monastero Santa Rosa.\n' +
            'Sunset boat aperitivo from Amalfi port.'
        }
      ]
    }
  },
  {
    keys: ['tokyo', 'tokyo japan'],
    label: 'Tokyo, Japan',
    transportTip: 'Suica/PASMO IC card for metro; start early for Tsukiji/Toyosu.',
    plans: {
      Balanced: [
        {
          title: 'Asakusa & Skytree',
          details:
            '08:00 — Senso-ji Temple (Asakusa) before crowds.\n' +
            '10:00 — Nakamise shopping street snacks.\n' +
            '12:00 — Lunch: Tempura Daikokuya (Asakusa).\n' +
            '14:00 — Tokyo Skytree observation deck.\n' +
            '17:00 — Sumida river walk.\n' +
            '19:00 — Dinner in Ryogoku (chanko nabe wrestling district).'
        },
        {
          title: 'Shibuya & Harajuku',
          details:
            '09:00 — Meiji Shrine forest walk.\n' +
            '11:00 — Harajuku Takeshita Street & crepes.\n' +
            '13:00 — Lunch: Afuri ramen (Harajuku).\n' +
            '15:00 — Shibuya Crossing & Hachiko statue.\n' +
            '17:00 — Shibuya Sky observation.\n' +
            '20:00 — Izakaya dinner in Omoide Yokocho (Shinjuku).'
        }
      ]
    }
  },
  {
    keys: ['paris', 'paris france'],
    label: 'Paris, France',
    transportTip: 'Navigo Easy or single t+ tickets for metro; book Louvre/Eiffel slots online.',
    plans: {
      Balanced: [
        {
          title: 'Île de la Cité & Latin Quarter',
          details:
            '09:00 — Café crème at Café de Flore (Saint-Germain).\n' +
            '10:00 — Notre-Dame exterior & Sainte-Chapelle (timed ticket).\n' +
            '12:30 — Lunch: Le Bouillon Chartier (Grands Boulevards) or Latin Quarter crêpes.\n' +
            '14:30 — Luxembourg Gardens walk.\n' +
            '16:30 — Panthéon or Cluny Museum (Medieval Paris).\n' +
            '19:30 — Seine stroll & dinner in Saint-Germain: Les Deux Magots area.'
        },
        {
          title: 'Eiffel & Trocadéro',
          details:
            '09:00 — Eiffel Tower summit (pre-booked slot).\n' +
            '11:30 — Trocadéro photos & Café du Trocadéro.\n' +
            '13:00 — Lunch near Champ de Mars.\n' +
            '15:00 — Musée du quai Branly or Army Museum (Les Invalides).\n' +
            '17:30 — Batobus Seine cruise from Eiffel.\n' +
            '20:00 — Dinner: Le Jules Verne (splurge) or Le Relais de l\'Entrecôte.'
        },
        {
          title: 'Montmartre & Marais',
          details:
            '08:30 — Sacré-Cœur before crowds; Place du Tertre artists.\n' +
            '11:00 — Marché des Enfants Rouges (oldest covered market).\n' +
            '13:00 — Lunch in Le Marais (L\'As du Fallafel if open).\n' +
            '15:00 — Centre Pompidou or Picasso Museum.\n' +
            '19:00 — Sunset at Pont des Arts; dinner in Oberkampf.'
        }
      ],
      Food: [
        {
          title: 'Patisserie & markets',
          details:
            '08:00 — Croissants at Du Pain et des Idées.\n' +
            '10:00 — Rue Cler market tasting walk.\n' +
            '13:00 — Bistro lunch: Chez L\'Ami Jean.\n' +
            '16:00 — Fromagerie & wine at La Grande Épicerie.\n' +
            '20:00 — Classic French: Le Comptoir du Relais.'
        }
      ]
    }
  },
  {
    keys: ['rome', 'roma', 'rome italy'],
    label: 'Rome, Italy',
    transportTip: 'Walk the centro storico; use Roma 24/48/72h pass for metro to Vatican.',
    plans: {
      Balanced: [
        {
          title: 'Colosseum & Roman Forum',
          details:
            '08:30 — Colosseum (book skip-the-line + underground if available).\n' +
            '11:00 — Roman Forum & Palatine Hill (same ticket).\n' +
            '13:00 — Lunch in Monti: La Carbonara or Ai Tre Scalini.\n' +
            '15:00 — Capitoline Museums or Trevi Fountain + Pantheon.\n' +
            '18:00 — Aperitivo in Piazza Navona.\n' +
            '20:30 — Dinner in Trastevere: Da Enzo al 29 (reserve).'
        },
        {
          title: 'Vatican City',
          details:
            '08:00 — Vatican Museums early entry (Sistine Chapel).\n' +
            '11:30 — St. Peter\'s Basilica dome climb.\n' +
            '13:30 — Lunch near Prati: Pizzarium for gourmet pizza al taglio.\n' +
            '15:30 — Castel Sant\'Angelo.\n' +
            '17:30 — Lungotevere walk at sunset.'
        }
      ]
    }
  },
  {
    keys: ['dubrovnik', 'dubrovnik croatia'],
    label: 'Dubrovnik, Croatia',
    transportTip: 'Walk the Old Town; take ferry to Lokrum or bus to Cavtat.',
    plans: {
      Balanced: [
        {
          title: 'Old Town walls',
          details:
            '08:00 — City walls walk (go early, 2 km circuit).\n' +
            '10:30 — Stradun, Rector\'s Palace, Franciscan Monastery.\n' +
            '13:00 — Seafood at Proto or Nautika (reserve).\n' +
            '15:00 — Cable car to Mount Srđ panorama.\n' +
            '19:00 — Buža Bar cliff drinks (enter through wall hole).'
        },
        {
          title: 'Lokrum island',
          details:
            '09:00 — Ferry to Lokrum (15 min).\n' +
            '10:00 — Botanical garden & Fort Royal hike.\n' +
            '13:00 — Picnic or island restaurant.\n' +
            '16:00 — Swim at Dead Sea salt lake.\n' +
            '18:00 — Return; sunset at Banje Beach.'
        }
      ]
    }
  }
];

function findProfile(destination) {
  const key = normalizeDestinationKey(destination);
  if (!key) return null;

  return (
    PROFILES.find((profile) =>
      profile.keys.some((alias) => key.includes(alias) || alias.includes(key))
    ) || null
  );
}

function styleKey(style) {
  const normalized = String(style || 'Balanced').trim();
  const match = ['Balanced', 'Adventure', 'Culture', 'Relax', 'Food', 'Family'].find(
    (preset) => preset.toLowerCase() === normalized.toLowerCase()
  );
  return match || 'Balanced';
}

function pickPlanPool(profile, style) {
  const stylePlans = profile.plans[styleKey(style)] || profile.plans.Balanced || [];
  const balanced = profile.plans.Balanced || [];
  return stylePlans.length ? stylePlans : balanced;
}

function generateProfileItinerary(request) {
  const profile = findProfile(request.destination);
  if (!profile) return null;

  const pool = pickPlanPool(profile, request.style);
  if (!pool.length) return null;

  const stamp = request.seed || Date.now();
  const items = Array.from({ length: request.days }, (_, index) => {
    const dayNumber = index + 1;
    const plan = pool[(dayNumber - 1 + Math.abs(Math.floor(stamp / 1000))) % pool.length];
    return {
      id: `profile-${stamp}-${dayNumber}`,
      day: dayNumber,
      title: `Day ${dayNumber}: ${plan.title}`,
      details: `${plan.details}\n\nTransport: ${profile.transportTip}`
    };
  });

  return {
    profile,
    items
  };
}

function profilePromptHints(destination) {
  const profile = findProfile(destination);
  if (!profile) return '';

  const sample = pickPlanPool(profile, 'Balanced')
    .slice(0, 2)
    .map((day) => `- ${day.title}: ${day.details.split('\n')[0]}`)
    .join('\n');

  return [
    `Reference destination: ${profile.label}.`,
    profile.transportTip ? `Local transport: ${profile.transportTip}` : '',
    sample ? `Example real venues in this area:\n${sample}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

module.exports = {
  findProfile,
  generateProfileItinerary,
  profilePromptHints
};
