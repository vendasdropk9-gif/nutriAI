-- Migration: 20260710000000_init.sql
-- Description: Init schema for NutriAI, replacing Firestore with Supabase PostgreSQL.

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES Table (Syncs with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY, -- Can be UUID from auth.users or a local-user-id string
    name TEXT NOT NULL,
    email TEXT,
    photo_url TEXT,
    preferences TEXT DEFAULT 'Sem preferências gravadas',
    restrictions TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    goals TEXT DEFAULT 'Me alimentar melhor',
    equipment TEXT[] DEFAULT '{}',
    weight NUMERIC,
    height NUMERIC,
    age INTEGER,
    activity_level TEXT,
    gender TEXT,
    target_weight NUMERIC,
    skin_tone TEXT,
    hair_color TEXT,
    body_type TEXT,
    metabolism TEXT,
    routine TEXT,
    water_goal INTEGER DEFAULT 2000,
    water_reminder_enabled BOOLEAN DEFAULT true,
    water_reminder_interval_minutes INTEGER DEFAULT 60,
    water_reminder_start_hour INTEGER DEFAULT 8,
    water_reminder_end_hour INTEGER DEFAULT 22,
    points INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_active_date TEXT,
    badges TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow individual update" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow individual insert" ON public.profiles FOR INSERT WITH CHECK (true);

-- 2. INTAKE LOGS Table
CREATE TABLE IF NOT EXISTS public.intake_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- ISO date/timestamp string
    meal_id TEXT NOT NULL,
    recipe_name TEXT NOT NULL,
    planned_calories NUMERIC NOT NULL,
    planned_protein NUMERIC NOT NULL,
    planned_carbs NUMERIC NOT NULL,
    planned_fat NUMERIC NOT NULL,
    actual_calories NUMERIC NOT NULL,
    actual_protein NUMERIC NOT NULL,
    actual_carbs NUMERIC NOT NULL,
    actual_fat NUMERIC NOT NULL,
    adjusted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.intake_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations intake_logs" ON public.intake_logs FOR ALL USING (true);

-- 3. PROGRESS LOGS Table
CREATE TABLE IF NOT EXISTS public.progress_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    weight NUMERIC NOT NULL,
    body_fat NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations progress_logs" ON public.progress_logs FOR ALL USING (true);

-- 4. HYDRATION LOGS Table
CREATE TABLE IF NOT EXISTS public.hydration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    amount INTEGER NOT NULL, -- in ml
    source TEXT DEFAULT 'Filtrada',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations hydration_logs" ON public.hydration_logs FOR ALL USING (true);

-- 5. WORKOUT LOGS Table
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    duration_minutes INTEGER NOT NULL,
    intensity TEXT NOT NULL, -- Leve, Moderado, Intenso
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations workout_logs" ON public.workout_logs FOR ALL USING (true);

-- 6. SLEEP LOGS Table
CREATE TABLE IF NOT EXISTS public.sleep_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    duration_hours NUMERIC NOT NULL,
    quality TEXT NOT NULL, -- Péssimo, Ruim, Regular, Bom, Excelente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations sleep_logs" ON public.sleep_logs FOR ALL USING (true);

-- 7. EMOTIONAL LOGS Table
CREATE TABLE IF NOT EXISTS public.emotional_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    mood TEXT NOT NULL,
    trigger TEXT,
    meal_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.emotional_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations emotional_logs" ON public.emotional_logs FOR ALL USING (true);

-- 8. FASTING LOGS Table
CREATE TABLE IF NOT EXISTS public.fasting_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    duration_hours NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.fasting_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations fasting_logs" ON public.fasting_logs FOR ALL USING (true);

-- 9. BLOOD PRESSURE LOGS Table
CREATE TABLE IF NOT EXISTS public.blood_pressure_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    bpm INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.blood_pressure_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations blood_pressure_logs" ON public.blood_pressure_logs FOR ALL USING (true);

-- 10. BODY MONITOR LOGS Table
CREATE TABLE IF NOT EXISTS public.body_monitor_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    heart_rate INTEGER NOT NULL,
    stress_level INTEGER NOT NULL,
    fatigue_level INTEGER NOT NULL,
    anxiety_level INTEGER NOT NULL,
    notes TEXT,
    facial_scan_consent BOOLEAN DEFAULT false,
    finger_scan_consent BOOLEAN DEFAULT false,
    status TEXT NOT NULL, -- normal, attention, high_signals
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.body_monitor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations body_monitor_logs" ON public.body_monitor_logs FOR ALL USING (true);

-- 11. NOTES Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations notes" ON public.notes FOR ALL USING (true);

-- 12. FRIDGE ITEMS Table
CREATE TABLE IF NOT EXISTS public.fridge_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    expiry_date TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.fridge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations fridge_items" ON public.fridge_items FOR ALL USING (true);

-- 13. PLANT IDENTIFICATIONS Table
CREATE TABLE IF NOT EXISTS public.plant_identifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plant_name TEXT NOT NULL,
    scientific_name TEXT,
    description TEXT,
    health_status TEXT,
    care_instructions TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.plant_identifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations plant_identifications" ON public.plant_identifications FOR ALL USING (true);

-- 14. GARDEN ITEMS Table
CREATE TABLE IF NOT EXISTS public.garden_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    last_watered TEXT,
    next_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.garden_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations garden_items" ON public.garden_items FOR ALL USING (true);

-- 15. ALLERGY SCANS Table
CREATE TABLE IF NOT EXISTS public.allergy_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    ingredients TEXT,
    detected_allergens TEXT[] DEFAULT '{}',
    is_safe BOOLEAN DEFAULT true,
    alternative_suggestion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.allergy_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations allergy_scans" ON public.allergy_scans FOR ALL USING (true);

-- 16. RECIPE REVIEWS Table (Global with reference to user)
CREATE TABLE IF NOT EXISTS public.recipe_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.recipe_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global recipe_reviews access" ON public.recipe_reviews FOR ALL USING (true);

-- 17. FAVORITE HERBS Table
CREATE TABLE IF NOT EXISTS public.favorite_herbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    herb_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.favorite_herbs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations favorite_herbs" ON public.favorite_herbs FOR ALL USING (true);

-- 18. DELIVERIES Table
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL,
    partner_id TEXT NOT NULL,
    status TEXT NOT NULL,
    estimated_arrival TEXT,
    driver_name TEXT,
    driver_lat NUMERIC,
    driver_lng NUMERIC,
    route TEXT[], -- Array of polyline coordinates
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global deliveries access" ON public.deliveries FOR ALL USING (true);

-- 19. ORDERS Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    items JSONB NOT NULL, -- Stores array of ordered products
    total NUMERIC NOT NULL,
    status TEXT NOT NULL, -- pending, processing, delivered, etc.
    payment_method TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations orders" ON public.orders FOR ALL USING (true);

-- 20. PRODUCT COMPARISONS Table
CREATE TABLE IF NOT EXISTS public.product_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_ids TEXT[] DEFAULT '{}',
    analysis_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.product_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations product_comparisons" ON public.product_comparisons FOR ALL USING (true);

-- 21. ADAPTIVE INSIGHTS Table
CREATE TABLE IF NOT EXISTS public.adaptive_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT NOT NULL, -- macro_adjustment, workout_adaptation, habit_nudge
    recommendation TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    changes JSONB, -- stores strategy changes
    status TEXT DEFAULT 'pending', -- pending, applied, dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.adaptive_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations adaptive_insights" ON public.adaptive_insights FOR ALL USING (true);

-- 22. MUSHROOM IDENTIFICATIONS Table
CREATE TABLE IF NOT EXISTS public.mushroom_identifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mushroom_name TEXT NOT NULL,
    scientific_name TEXT,
    is_edible BOOLEAN DEFAULT false,
    confidence NUMERIC,
    description TEXT,
    warnings TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mushroom_identifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User operations mushroom_identifications" ON public.mushroom_identifications FOR ALL USING (true);

-- 23. FEEDBACKS Table (Global)
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    comment TEXT NOT NULL,
    rating INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global feedbacks access" ON public.feedbacks FOR ALL USING (true);

-- 24. COURIERS Table
CREATE TABLE IF NOT EXISTS public.couriers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    photo_url TEXT,
    vehicle_type TEXT,
    vehicle_model TEXT,
    routes TEXT[] DEFAULT '{}',
    hours TEXT,
    rating NUMERIC,
    rating_count INTEGER,
    status TEXT DEFAULT 'available',
    current_lat NUMERIC,
    current_lng NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global couriers access" ON public.couriers FOR ALL USING (true);

-- 25. MEDICINAL HERBS Table
CREATE TABLE IF NOT EXISTS public.medicinal_herbs (
    id TEXT PRIMARY KEY,
    popular_name TEXT NOT NULL,
    scientific_name TEXT,
    botanical_family TEXT,
    other_names TEXT[] DEFAULT '{}',
    description TEXT,
    origin TEXT,
    biome TEXT,
    states TEXT[] DEFAULT '{}',
    harvest_season TEXT,
    part_used TEXT,
    properties TEXT[] DEFAULT '{}',
    indications JSONB,
    preparation JSONB,
    dosage JSONB,
    contraindications JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.medicinal_herbs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global medicinal_herbs access" ON public.medicinal_herbs FOR ALL USING (true);

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
