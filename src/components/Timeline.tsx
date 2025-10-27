import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, MapPin, Activity } from 'lucide-react';
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

const Timeline = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'mild',
    affected_area: '',
    duration: '',
    photo: null as File | null,
  });

  useEffect(() => {
    if (user) {
      fetchSymptoms();
    }
  }, [user]);

  const fetchSymptoms = async () => {
    try {
      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSymptoms(data || []);
    } catch (error) {
      console.error('Error fetching symptoms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('symptom-photos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('symptom-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let photoUrl = null;
      if (formData.photo) {
        photoUrl = await handlePhotoUpload(formData.photo);
      }

      const { error } = await supabase.from('symptoms').insert({
        patient_id: user?.id,
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        affected_area: formData.affected_area,
        duration: formData.duration,
        photo_url: photoUrl,
      });

      if (error) throw error;

      toast({
        title: "Symptom added",
        description: "Your symptom has been added to your timeline.",
      });

      setDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        severity: 'mild',
        affected_area: '',
        duration: '',
        photo: null,
      });
      fetchSymptoms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your timeline...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-primary">Your Health Timeline</h2>
          <p className="text-muted-foreground mt-1">Track your symptoms over time</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="medical-gradient text-white gap-2">
              <Plus className="w-4 h-4" />
              Add Symptom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Symptom</DialogTitle>
              <DialogDescription>Record a new symptom with details and optional photo</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Symptom Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Rash on arm"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your symptom..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    placeholder="e.g., 2 days"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="affected_area">Affected Area</Label>
                <Input
                  id="affected_area"
                  placeholder="e.g., Left forearm"
                  value={formData.affected_area}
                  onChange={(e) => setFormData({ ...formData, affected_area: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="photo">Photo (optional)</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                />
              </div>
              
              <Button type="submit" className="w-full medical-gradient text-white" disabled={uploading}>
                {uploading ? "Uploading..." : "Add Symptom"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {symptoms.length === 0 ? (
          <Card className="shadow-medical">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No symptoms recorded yet. Start tracking your health by adding your first symptom.
              </p>
            </CardContent>
          </Card>
        ) : (
          symptoms.map((symptom) => (
            <Card key={symptom.id} className="shadow-medical transition-smooth hover:shadow-lg">
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Timeline;
