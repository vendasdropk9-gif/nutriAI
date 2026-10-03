import enJson from '../../locales/en/common.json';

/**
 * Australian English (AU / en-AU) Localization Bundle
 * Features Australian spelling (colour, flavour, customise, fibre, analyse),
 * Australian food terminology (capsicum, rocket, coriander),
 * Metric units (kg, grams, kJ), and $ AUD currency.
 */
export const enAU = {
  ...enJson,
  locale: 'en-AU',
  country: 'Australia',
  currency: 'AUD',
  currency_symbol: '$',
  region_name: 'Australia',

  // Australian spellings & vocabulary
  quickdishes: 'Quick Dishes',
  coach: 'AI Health Coach',
  smartplate: 'Smart Plate Analyser',
  generator: 'Recipe Generator',
  fridge: 'Smart Fridge',
  analyzer: 'Plate Analyser',
  plate_analysis: 'Plate Analyser',
  shopping: 'Shopping List',
  shopping_list: 'Shopping List',
  weight_control: 'Weight Tracker (kg)',
  workouts: 'Workouts',
  trainer: 'Personal Trainer',
  habits: 'Daily Habits',
  notes: 'My Notes',
  wellness: 'Wellness',
  avatar: '3D Workout Studio',
  profile: 'Profile & Settings',
  settings: 'Settings & Preferences',
  pricing: 'Premium Plan',

  // Australian food & ingredient nomenclature
  eggplant: 'Eggplant',
  zucchini: 'Zucchini',
  arugula: 'Rocket',
  cilantro: 'Coriander',
  bell_pepper: 'Capsicum',
  breakfast: 'Brekkie & Breakfast',
  pantry: 'Pantry',

  common: {
    save: 'Save',
    cancel: 'Cancel',
    back: 'Back',
    next: 'Next',
    recipes: 'Recipes',
    my_progress: 'My Progress',
    lose_weight: 'I want to lose weight',
    gain_mass: 'I want to build muscle',
    loading: 'Loading...',
    close: 'Close',
    confirm: 'Confirm',
    customize: 'Customise',
    favorites: 'Favourites',
    color: 'Colour',
    flavor: 'Flavour',
    fiber: 'Fibre',
    program: 'Program',
    optimized: 'Optimised',
    personalized: 'Personalised'
  },
  my_progress: 'My Progress',
  lose_weight: 'I want to lose weight',
  gain_mass: 'I want to build muscle',
};

export default enAU;
