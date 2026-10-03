import enJson from '../../locales/en/common.json';

/**
 * British English (UK / en-GB) Localization Bundle
 * Features British spelling (colour, flavour, customise, fibre, analyse),
 * UK food terminology (aubergine, courgette, rocket, coriander),
 * Metric & stone units, and £ GBP currency.
 */
export const enGB = {
  ...enJson,
  locale: 'en-GB',
  country: 'United Kingdom',
  currency: 'GBP',
  currency_symbol: '£',
  region_name: 'United Kingdom',

  // British spellings & vocabulary
  quickdishes: 'Quick Dishes',
  coach: 'AI Health Coach',
  smartplate: 'Smart Plate Analyser',
  generator: 'Recipe Generator',
  fridge: 'Smart Fridge',
  analyzer: 'Plate Analyser',
  plate_analysis: 'Plate Analyser',
  shopping: 'Shopping List',
  shopping_list: 'Shopping List',
  weight_control: 'Weight Tracker (kg / st)',
  workouts: 'Workouts',
  trainer: 'Personal Trainer',
  habits: 'Daily Habits',
  notes: 'My Notes',
  wellness: 'Wellness',
  avatar: '3D Workout Studio',
  profile: 'Profile & Settings',
  settings: 'Settings & Preferences',
  pricing: 'Premium Plan',

  // UK food & ingredient nomenclature
  eggplant: 'Aubergine',
  zucchini: 'Courgette',
  arugula: 'Rocket',
  cilantro: 'Coriander',
  bell_pepper: 'Pepper',
  breakfast: 'Breakfast',
  pantry: 'Larder & Pantry',

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
    program: 'Programme',
    optimized: 'Optimised',
    personalized: 'Personalised'
  },
  my_progress: 'My Progress',
  lose_weight: 'I want to lose weight',
  gain_mass: 'I want to build muscle',
};

export default enGB;
