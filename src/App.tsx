import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Camera, MapPin, AlertTriangle, CheckCircle, UploadCloud, Loader2, Info, LayoutDashboard, Calendar } from 'lucide-react';

interface Issue {
  id: number;
  category: string;
  severity: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'report' | 'dashboard'>('report');
  
  // Report Form State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');
  const [result, setResult] = useState<{ category: string, severity: string, description: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dashboard State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  
  // Filter & Sort State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const categories = ['All', 'Pothole', 'Streetlight', 'Leak', 'Garbage', 'Other'];

  useEffect(() => {
    if (activeTab === 'report') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setLocationStatus('Location captured');
          },
          (error) => {
            console.warn('Geolocation blocked or failed:', error);
            setLocationStatus('Location disabled');
          }
        );
      } else {
        setLocationStatus('Location not supported');
      }
    } else if (activeTab === 'dashboard') {
      fetchIssues();
    }
  }, [activeTab]);

  const fetchIssues = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const response = await axios.get('/api/issues');
      if (response.data.success) {
        setIssues(response.data.data);
      } else {
        setDashboardError('Failed to fetch issues.');
      }
    } catch (err) {
      console.error(err);
      setDashboardError('Database cannot be reached or is not configured.');
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setResult(null);
        setError(null);
      } else {
        setError('Please drop an image file.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);
    if (location) {
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
    }

    try {
      const response = await axios.post('/api/issues', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setError('Server returned an error.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (severity: string) => {
    switch(severity?.toLowerCase()) {
      case 'high': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'low': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const renderActiveView = () => {
    if (activeTab === 'report') {
      return (
        <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
          {/* Upload Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Report an Issue
            </h2>

            <div 
              className="border-2 border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[300px] relative overflow-hidden group"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
              ) : null}

              <div className="relative z-10 flex flex-col items-center space-y-4">
                <div className="p-4 bg-slate-800/80 rounded-full text-slate-300 backdrop-blur-sm border border-slate-700">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-white shadow-sm">
                    {previewUrl ? 'Click to change photo' : 'Click or drop a photo here'}
                  </p>
                  <p className="text-sm text-slate-400 drop-shadow-md">
                    Supports JPG, PNG up to 10MB
                  </p>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            {/* Location Status */}
            <div className="mt-6 flex items-center gap-3 text-sm text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span>{locationStatus}</span>
              {location && <span className="ml-auto font-mono text-xs opacity-70">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={!file || loading}
                className="w-full relative overflow-hidden flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>🧠 AI is analyzing your report...</span>
                  </>
                ) : (
                  <>
                    Submit Report
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
          </div>

          {/* Success Card */}
          {result && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full mt-1 shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="space-y-4 w-full">
                  <div>
                    <h3 className="text-xl font-medium text-emerald-400">Report Processed</h3>
                    <p className="text-emerald-500/70 text-sm">Our AI has successfully analyzed and logged the issue.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Category</p>
                      <p className="text-lg font-medium text-white">{result.category}</p>
                    </div>
                    <div className={`border rounded-xl p-4 flex flex-col justify-center ${severityColor(result.severity)}`}>
                       <p className="text-xs uppercase tracking-wider font-semibold mb-1 opacity-70">Severity</p>
                      <p className="text-lg font-medium">{result.severity}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">AI Description</p>
                    <p className="text-slate-300 flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 shrink-0 opacity-50" />
                      {result.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    const filteredIssues = issues
      .filter(issue => selectedCategory === 'All' || issue.category === selectedCategory)
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });

    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2 shrink-0">
            <LayoutDashboard className="w-6 h-6 text-blue-400" />
            Live Dashboard
          </h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <option value="newest">Sort by Newest</option>
              <option value="oldest">Sort by Oldest</option>
            </select>
            <button 
              onClick={fetchIssues}
              className="text-sm border border-slate-800 font-medium text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-xl transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mt-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                selectedCategory === cat 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {dashboardLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p>Loading reports...</p>
          </div>
        ) : dashboardError ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-center">
            <p className="mb-2 font-medium">Error loading dashboard</p>
            <p className="text-sm opacity-80">{dashboardError}</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-3xl">
            <p className="text-slate-400 text-lg">
              {issues.length === 0 ? 'No issues reported yet.' : 'No issues found for this category.'}
            </p>
            <p className="text-slate-500 mt-2 text-sm">
              {issues.length === 0 ? 'Be the first to keep your community safe.' : 'Try selecting a different filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIssues.map((issue) => (
              <div 
                key={issue.id} 
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors shadow-lg flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${severityColor(issue.severity)}`}>
                    {issue.severity} Severity
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(issue.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <h3 className="text-xl font-medium text-white mb-2">{issue.category}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
                  {issue.description}
                </p>

                <div className="pt-4 border-t border-slate-800/50 flex items-center gap-2 text-xs text-slate-500 mt-auto">
                  <MapPin className="w-3.5 h-3.5" />
                  {issue.latitude && issue.longitude 
                    ? `${Number(issue.latitude).toFixed(3)}, ${Number(issue.longitude).toFixed(3)}`
                    : 'Location unavailable'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Top Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Camera className="w-5 h-5" />
              </div>
              <span className="font-semibold text-white tracking-tight">Community Hero</span>
            </div>
            
            <div className="flex bg-slate-950 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'report' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Report Issue
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'dashboard' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="p-4 sm:p-8">
        {renderActiveView()}
      </main>
    </div>
  );
}
