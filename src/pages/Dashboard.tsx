import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Activity, LogOut } from 'lucide-react';
import Timeline from '@/components/Timeline';
import Chat from '@/components/Chat';
import SymptomFinder from '@/components/SymptomFinder';

const Dashboard = () => {
  const { user, userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && userRole === 'doctor') {
      navigate('/doctor');
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
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
            <h1 className="text-xl font-semibold text-primary">Symptom Timeline Diary</h1>
          </div>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 max-w-2xl mx-auto">
            <TabsTrigger value="timeline">Personal Timeline</TabsTrigger>
            <TabsTrigger value="chat">Chat with Professional</TabsTrigger>
            <TabsTrigger value="finder">Find Your Symptom</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="space-y-4">
            <Timeline />
          </TabsContent>
          
          <TabsContent value="chat">
            <Chat />
          </TabsContent>
          
          <TabsContent value="finder">
            <SymptomFinder />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
