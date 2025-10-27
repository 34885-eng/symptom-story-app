import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SymptomInfo {
  name: string;
  description: string;
  keywords: string[];
}

const symptomDatabase: SymptomInfo[] = [
  {
    name: "Rash",
    description: "A change in skin appearance or texture, often with redness, bumps, or irritation.",
    keywords: ["itchy", "red", "bumps", "skin", "irritation", "hives"]
  },
  {
    name: "Fever",
    description: "Elevated body temperature, usually above 100.4°F (38°C), often indicating infection.",
    keywords: ["temperature", "hot", "chills", "sweating", "infection"]
  },
  {
    name: "Headache",
    description: "Pain in the head or upper neck, ranging from mild to severe.",
    keywords: ["pain", "head", "migraine", "pressure", "throbbing"]
  },
  {
    name: "Cough",
    description: "A reflex action to clear airways of mucus, irritants, or foreign particles.",
    keywords: ["throat", "phlegm", "dry", "productive", "wheeze"]
  },
  {
    name: "Fatigue",
    description: "Extreme tiredness or lack of energy that doesn't improve with rest.",
    keywords: ["tired", "exhausted", "weak", "energy", "sleepy"]
  },
  {
    name: "Nausea",
    description: "An uncomfortable sensation of wanting to vomit.",
    keywords: ["sick", "stomach", "queasy", "vomit", "upset"]
  },
  {
    name: "Swelling",
    description: "Enlargement or puffiness in a body part due to fluid accumulation.",
    keywords: ["puffy", "inflammation", "edema", "enlarged", "bloated"]
  },
  {
    name: "Joint Pain",
    description: "Discomfort, aches, or soreness in body joints.",
    keywords: ["arthritis", "stiff", "ache", "knee", "elbow", "shoulder"]
  }
];

const SymptomFinder = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSymptoms, setFilteredSymptoms] = useState<SymptomInfo[]>(symptomDatabase);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredSymptoms(symptomDatabase);
      return;
    }

    const lowerTerm = term.toLowerCase();
    const filtered = symptomDatabase.filter((symptom) =>
      symptom.name.toLowerCase().includes(lowerTerm) ||
      symptom.description.toLowerCase().includes(lowerTerm) ||
      symptom.keywords.some((keyword) => keyword.toLowerCase().includes(lowerTerm))
    );

    setFilteredSymptoms(filtered);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-primary mb-2">Find Your Symptom</h2>
        <p className="text-muted-foreground">Search for symptoms by name or characteristics</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          placeholder="Search symptoms (e.g., 'rash', 'itchy red bumps')..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4">
        {filteredSymptoms.length === 0 ? (
          <Card className="shadow-medical">
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No symptoms found matching your search.</p>
            </CardContent>
          </Card>
        ) : (
          filteredSymptoms.map((symptom) => (
            <Card key={symptom.name} className="shadow-medical transition-smooth hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">{symptom.name}</CardTitle>
                <CardDescription>{symptom.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {symptom.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-3 py-1 bg-secondary rounded-full text-xs text-secondary-foreground"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SymptomFinder;
