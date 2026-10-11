import enJson from '../../locales/en/common.json';

/**
 * American English (US / en-US) Localization Bundle
 * Features standard US terminology, American spelling (color, flavor, customize, fiber),
 * US customary unit support, and $ USD.
 */
export const enUS = {
  ...enJson,
  locale: 'en-US',
  country: 'United States',
  currency: 'USD',
  currency_symbol: '$',
  region_name: 'United States',

  // American spellings & vocabulary
  quickdishes: 'Quick Dishes',
  coach: 'AI Health Coach',
  smartplate: 'Smart Plate Analyzer',
  generator: 'Recipe Generator',
  fridge: 'Smart Fridge',
  analyzer: 'Plate Analyzer',
  plate_analysis: 'Plate Analyzer',
  shopping: 'Shopping List',
  shopping_list: 'Shopping List',
  weight_control: 'Weight Tracker (lbs)',
  workouts: 'Workouts',
  trainer: 'Personal Trainer',
  habits: 'Daily Habits',
  notes: 'My Notes',
  wellness: 'Wellness',
  avatar: '3D Workout Studio',
  profile: 'Profile & Settings',
  settings: 'Settings & Preferences',
  pricing: 'Premium Plan',

  // US food & ingredient nomenclature
  eggplant: 'Eggplant',
  zucchini: 'Zucchini',
  arugula: 'Arugula',
  cilantro: 'Cilantro',
  bell_pepper: 'Bell Pepper',
  breakfast: 'Breakfast',
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
    customize: 'Customize',
    customise: 'Customize',
    favorites: 'Favorites',
    favourites: 'Favorites',
    color: 'Color',
    colour: 'Color',
    flavor: 'Flavor',
    flavour: 'Flavor',
    fiber: 'Fiber',
    fibre: 'Fiber',
    program: 'Program',
    programme: 'Program',
    optimized: 'Optimized',
    optimised: 'Optimized',
    personalized: 'Personalized',
    personalised: 'Personalized'
  },
  my_progress: 'My Progress',
  lose_weight: 'I want to lose weight',
  gain_mass: 'I want to build muscle',
};

export default enUS;
