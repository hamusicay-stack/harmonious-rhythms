
CREATE TABLE IF NOT EXISTS public.equipment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand, model)
);

CREATE INDEX IF NOT EXISTS idx_equipment_catalog_brand ON public.equipment_catalog (brand);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_model ON public.equipment_catalog (model);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_category ON public.equipment_catalog (category);

ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment catalog is readable by everyone"
  ON public.equipment_catalog FOR SELECT USING (true);

CREATE POLICY "Admins can insert equipment catalog"
  ON public.equipment_catalog FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update equipment catalog"
  ON public.equipment_catalog FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete equipment catalog"
  ON public.equipment_catalog FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.equipment_catalog (category, subcategory, brand, model, specifications) VALUES
  ('guitars', 'electric', 'Fender', 'Stratocaster Player', '{"Frets":"22","Body":"Alder","Pickup":"Single-Coil","Neck":"Maple","Scale":"25.5\""}'::jsonb),
  ('guitars', 'electric', 'Fender', 'Telecaster Player', '{"Frets":"22","Body":"Alder","Pickup":"Single-Coil","Neck":"Maple"}'::jsonb),
  ('guitars', 'electric', 'Gibson', 'Les Paul Standard', '{"Frets":"22","Body":"Mahogany/Maple","Pickup":"Humbucker","Scale":"24.75\""}'::jsonb),
  ('guitars', 'acoustic', 'Martin', 'D-28', '{"Body":"Rosewood","Top":"Sitka Spruce","Frets":"20","Scale":"25.4\""}'::jsonb),
  ('keyboards', 'arranger', 'Yamaha', 'Genos 2', '{"Keys":"76","Polyphony":"384","Voices":"1750+","Styles":"800+"}'::jsonb),
  ('keyboards', 'arranger', 'Korg', 'Pa5X', '{"Keys":"76","Polyphony":"256","Sounds":"2000+","Touchscreen":"8 inch"}'::jsonb),
  ('keyboards', 'stage', 'Nord', 'Stage 4', '{"Keys":"88","Engines":"Piano/Organ/Synth","Polyphony":"120"}'::jsonb),
  ('keyboards', 'synth', 'Roland', 'Fantom-08', '{"Keys":"88","Polyphony":"256","Sound Engines":"ZEN-Core/V-Piano"}'::jsonb),
  ('mics', 'dynamic', 'Shure', 'SM7B', '{"Type":"Dynamic","Pattern":"Cardioid","Response":"50Hz-20kHz","Connector":"XLR"}'::jsonb),
  ('mics', 'condenser', 'Neumann', 'TLM 103', '{"Type":"Condenser","Pattern":"Cardioid","Response":"20Hz-20kHz","Self-Noise":"7 dB-A"}'::jsonb)
ON CONFLICT (brand, model) DO NOTHING;
