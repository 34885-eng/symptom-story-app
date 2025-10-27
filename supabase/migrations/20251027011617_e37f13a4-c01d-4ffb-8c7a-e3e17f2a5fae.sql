-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create symptoms table for timeline entries
CREATE TABLE public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  affected_area TEXT,
  duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create doctor_notes table
CREATE TABLE public.doctor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_id UUID REFERENCES public.symptoms(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  progress_status TEXT CHECK (progress_status IN ('improving', 'stable', 'worsening')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table for chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  symptom_reference UUID REFERENCES public.symptoms(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create patient_doctor_assignments table
CREATE TABLE public.patient_doctor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, doctor_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_doctor_assignments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for symptoms
CREATE POLICY "Patients can view their own symptoms"
  ON public.symptoms FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view assigned patients' symptoms"
  ON public.symptoms FOR SELECT
  USING (
    public.has_role(auth.uid(), 'doctor') AND
    EXISTS (
      SELECT 1 FROM public.patient_doctor_assignments
      WHERE patient_id = symptoms.patient_id
      AND doctor_id = auth.uid()
    )
  );

CREATE POLICY "Patients can insert their own symptoms"
  ON public.symptoms FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own symptoms"
  ON public.symptoms FOR UPDATE
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete their own symptoms"
  ON public.symptoms FOR DELETE
  USING (auth.uid() = patient_id);

-- RLS Policies for doctor_notes
CREATE POLICY "Doctors can insert notes"
  ON public.doctor_notes FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') AND
    auth.uid() = doctor_id
  );

CREATE POLICY "Doctors can view their own notes"
  ON public.doctor_notes FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can view notes on their symptoms"
  ON public.doctor_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.symptoms
      WHERE symptoms.id = doctor_notes.symptom_id
      AND symptoms.patient_id = auth.uid()
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- RLS Policies for patient_doctor_assignments
CREATE POLICY "Users can view their assignments"
  ON public.patient_doctor_assignments FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "Patients can create assignments"
  ON public.patient_doctor_assignments FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Create storage bucket for symptom photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('symptom-photos', 'symptom-photos', true);

-- Storage policies
CREATE POLICY "Users can upload their own symptom photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'symptom-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view symptom photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'symptom-photos');

CREATE POLICY "Users can update their own symptom photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'symptom-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own symptom photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'symptom-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_symptoms_updated_at
  BEFORE UPDATE ON public.symptoms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;