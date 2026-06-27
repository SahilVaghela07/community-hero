import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { Camera, AlertTriangle, Loader2, UploadCloud, MapPin, CheckCircle2, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ReportIssue: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Pothole');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [municipalityZone, setMunicipalityZone] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');

  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);

  const analyzeImage = async (selectedFile: File) => {
    setAiAnalyzing(true);
    setAiSuggested(false);
    
    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      const res = await axios.post('/api/analyze-image', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.data.success && res.data.data) {
        const { category, description } = res.data.data;
        if (category) {
          const mappedCategory = ['Pothole', 'Water Leakage', 'Garbage', 'Streetlight'].includes(category) ? category : (category === 'Water Leak' ? 'Water Leakage' : 'Other');
          setType(mappedCategory);
        }
        if (description) {
          setDescription(description);
        }
        setAiSuggested(true);
      }
    } catch (e) {
      console.error("AI analysis failed", e);
    } finally {
      setAiAnalyzing(false);
    }
  };

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('Detecting city...');
          
          try {
            // Reverse geocode to extract city
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
            if (city) {
              setMunicipalityZone(city);
              setLocationStatus(`Location Captured (${city})`);
            } else {
              setLocationStatus('Location Captured');
            }
          } catch (e) {
            console.warn('Reverse geocoding failed', e);
            setLocationStatus('Location Captured');
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setLocationStatus('Location Disabled');
        }
      );
    } else {
      setLocationStatus('Location Not Supported');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      analyzeImage(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
      analyzeImage(droppedFile);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    if (i18n.language === 'hi') {
      recognition.lang = 'hi-IN';
    } else if (i18n.language === 'gu') {
      recognition.lang = 'gu-IN';
    } else {
      recognition.lang = 'en-US';
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription((prev) => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!description || !type) return;

    if (!file) {
      setError('Please attach a photo of the issue to proceed.');
      return;
    }

    if (!location) {
      setError('Location is required. Please ensure GPS is active and grant permissions.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('description', description);
      formData.append('type', type);
      if (user?.id) {
        formData.append('reporter_id', String(user.id));
      }
      formData.append('latitude', String(location.lat || 0.0000));
      formData.append('longitude', String(location.lng || 0.0000));
      if (municipalityZone) {
        formData.append('municipality_zone', municipalityZone);
      }

      const response = await axios.post('/api/issues', formData, {
        headers: {
          // Do not manually set Content-Type to application/json or multipart/form-data. Let browser handle the boundary.
        }
      });

      if (response.data.success) {
        setSuccess('Issue reported successfully!');
        setFile(null);
        setPreviewUrl(null);
        setDescription('');
        setType('Pothole');
      } else {
        setError('Server returned an error.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Error: ' + (err.message || 'Failed to submit report. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl">
        <h2 className="text-xl font-medium text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-500" />
          Snap & Report
        </h2>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Unified Upload Area */}
          <div 
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[240px] relative overflow-hidden group"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
            ) : null}

            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="p-4 bg-white/80 dark:bg-slate-800/80 rounded-full text-slate-600 dark:text-slate-300 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-xl">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-slate-900 dark:text-white shadow-sm">
                  {previewUrl ? 'Click to change photo' : 'Drag & drop a photo, or click to browse'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 drop-shadow-md">
                  Supports JPG, PNG (Max 10MB)
                </p>
              </div>
            </div>
            {aiAnalyzing && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">AI is analyzing issue...</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-6 relative">
            
            {aiSuggested && (
              <div className="absolute -top-3 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10 animate-in fade-in zoom-in duration-300">
                ✨ AI Suggested
              </div>
            )}
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-2">{t("Type of Issue")}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="Pothole">Pothole</option>
                <option value="Water Leakage">Water Leakage</option>
                <option value="Garbage">Garbage</option>
                <option value="Streetlight">Streetlight</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-400">{t("Issue Description")}</label>
                <button
                  type="button"
                  onClick={startListening}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                    isListening 
                      ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-200 dark:border-rose-500/30' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                  title="Voice to text"
                >
                  <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-pulse' : ''}`} />
                  {isListening ? t("Listening...") : "Dictate"}
                </button>
              </div>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the issue and exact location..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Location Indicator */}
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800/50 mt-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            <span className="flex-1">{locationStatus}</span>
            <span className="font-mono text-xs opacity-70 bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800">
              GPS Active
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.99] mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting Report...</span>
              </>
            ) : (
              <>
                {t("Submit Report")}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
