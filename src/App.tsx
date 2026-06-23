import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Camera, ImageUp, MapPin, AlertTriangle, CheckCircle, UploadCloud, Loader2, Info } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewSize, setPreviewSize] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');
  const [result, setResult] = useState<{ category: string, severity: string, description: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
          // Fallback location or just leave as null
        }
      );
    } else {
      setLocationStatus('Location not supported');
    }
  }, []);

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
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8 mt-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 text-blue-400 rounded-2xl mb-4 border border-blue-500/20">
            <Camera className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Community Hero</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Report civic issues instantly. Snap a photo and let AI map, categorize, and report it for local authorities.
          </p>
        </div>

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
    </div>
  );
}

