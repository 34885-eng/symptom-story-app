import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, MessageSquarePlus } from 'lucide-react';
import { format } from 'date-fns';

interface Symptom {
  id: string;
  title: string;
  description: string;
  photo_url: string | null;
  severity: string | null;
  affected_area: string | null;
  duration: string | null;
  created_at: string;
}

interface DoctorNote {
  id: string;
  note: string;
  progress_status: string | null;
  created_at: string;
  doctor_id: string;
}

interface PatientTimelineProps {
  patientId: string;
  patientName: string;
}

const PatientTimeline = ({ patientId, patientName }: PatientTimelineProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [notes, setNotes] = useState<{ [key: string]: DoctorNote[] }>({});
  const [loading, setLoading] = useState(true);
  const [addingNote, setAddingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [progressStatus, setProgressStatus] = useState<string>('stable');

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    try {
      // Fetch symptoms
      const { data: symptomsData, error: symptomsError } = await supabase
        .from('symptoms')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (symptomsError) throw symptomsError;

      // Fetch all notes for these symptoms
      if (symptomsData && symptomsData.length > 0) {
        const symptomIds = symptomsData.map(s => s.id);
        const { data: notesData, error: notesError } = await supabase
          .from('doctor_notes')
          .select('*')
          .in('symptom_id', symptomIds)
          .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        // Group notes by symptom_id
        const groupedNotes: { [key: string]: DoctorNote[] } = {};
        notesData?.forEach((note: any) => {
          if (!groupedNotes[note.symptom_id]) {
            groupedNotes[note.symptom_id] = [];
          }
          groupedNotes[note.symptom_id].push(note);
        });

        setNotes(groupedNotes);
      }

      setSymptoms(symptomsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (symptomId: string) => {
    if (!noteText.trim()) return;

    try {
      const { error } = await supabase.from('doctor_notes').insert({
        symptom_id: symptomId,
        doctor_id: user?.id,
        note: noteText.trim(),
        progress_status: progressStatus,
      });

      if (error) throw error;

      toast({
        title: "Note added",
        description: "Your note has been added to this symptom.",
      });

      setAddingNote(null);
      setNoteText('');
      setProgressStatus('stable');
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading patient timeline...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-primary">{patientName}'s Timeline</h2>
        <p className="text-muted-foreground mt-1">Review symptoms and add professional notes</p>
      </div>

      <div className="space-y-4">
        {symptoms.length === 0 ? (
          <Card className="shadow-medical">
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No symptoms recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          symptoms.map((symptom) => (
            <Card key={symptom.id} className="shadow-medical">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{symptom.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(symptom.created_at), 'PPp')}
                      </span>
                      {symptom.affected_area && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {symptom.affected_area}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {symptom.severity && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      symptom.severity === 'severe' ? 'bg-destructive/10 text-destructive' :
                      symptom.severity === 'moderate' ? 'bg-accent/30 text-accent-foreground' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {symptom.severity}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {symptom.photo_url && (
                  <img
                    src={symptom.photo_url}
                    alt={symptom.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
                {symptom.description && (
                  <p className="text-sm text-foreground">{symptom.description}</p>
                )}
                {symptom.duration && (
                  <p className="text-sm text-muted-foreground">Duration: {symptom.duration}</p>
                )}

                {/* Doctor Notes Section */}
                {notes[symptom.id] && notes[symptom.id].length > 0 && (
                  <div className="border-t pt-4 mt-4 space-y-2">
                    <h4 className="font-medium text-sm text-primary">Professional Notes:</h4>
                    {notes[symptom.id].map((note) => (
                      <div key={note.id} className="bg-secondary/50 rounded-lg p-3 space-y-1">
                        <p className="text-sm">{note.note}</p>
                        {note.progress_status && (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                            note.progress_status === 'improving' ? 'bg-green-100 text-green-800' :
                            note.progress_status === 'worsening' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {note.progress_status}
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), 'PPp')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Note Form */}
                {addingNote === symptom.id ? (
                  <div className="border-t pt-4 space-y-3">
                    <Textarea
                      placeholder="Add your professional note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Select value={progressStatus} onValueChange={setProgressStatus}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="improving">Improving</SelectItem>
                          <SelectItem value="stable">Stable</SelectItem>
                          <SelectItem value="worsening">Worsening</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={() => handleAddNote(symptom.id)} className="medical-gradient text-white">
                        Save Note
                      </Button>
                      <Button variant="outline" onClick={() => setAddingNote(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setAddingNote(symptom.id)}
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    Add Professional Note
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PatientTimeline;
