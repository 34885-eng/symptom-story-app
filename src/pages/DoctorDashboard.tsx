import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, LogOut, Users } from 'lucide-react';
import PatientTimeline from '@/components/PatientTimeline';

interface Patient {
  id: string;
  full_name: string;
}

const DoctorDashboard = () => {
  const { user, userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && userRole === 'patient') {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user && userRole === 'doctor') {
      fetchPatients();
    }
  }, [user, userRole]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_doctor_assignments')
        .select(`
          patient_id,
          profiles!patient_doctor_assignments_patient_id_fkey (
            id,
            full_name
          )
        `)
        .eq('doctor_id', user?.id);

      if (error) throw error;

      const patientList = data?.map((assignment: any) => ({
        id: assignment.profiles.id,
        full_name: assignment.profiles.full_name,
      })) || [];

      setPatients(patientList);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoadingPatients(false);
    }
  };

  if (loading || loadingPatients) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(126,46%,95%)] to-white">
      <header className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-primary">Doctor Dashboard</h1>
          </div>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                My Patients
              </CardTitle>
              <CardDescription>Select a patient to view their timeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {patients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No patients assigned yet</p>
              ) : (
                patients.map((patient) => (
                  <Button
                    key={patient.id}
                    variant={selectedPatient?.id === patient.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    {patient.full_name}
                  </Button>
                ))
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            {selectedPatient ? (
              <PatientTimeline patientId={selectedPatient.id} patientName={selectedPatient.full_name} />
            ) : (
              <Card className="shadow-medical">
                <CardContent className="flex items-center justify-center h-96">
                  <p className="text-muted-foreground">Select a patient to view their timeline</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
