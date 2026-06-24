import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { Camera, AlertTriangle, Loader2, UploadCloud, MapPin, CheckCircle2 } from 'lucide-react';

export const ReportIssue: React.FC = () => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Pothole');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('Location Captured');
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !type) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('/api/issues', {
        photo_url: '',
        description,
        type,
        reporter_id: user?.id,
        latitude: location?.lat || null,
        longitude: location?.lng || null
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
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-500" />
          Snap & Report
        </h2>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Unified Upload Area */}
          <div 
            className="border-2 border-dashed border-slate-700 bg-slate-950/50 hover:bg-slate-800/50 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[240px] relative overflow-hidden group"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
            ) : null}

            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="p-4 bg-slate-800/80 rounded-full text-slate-300 backdrop-blur-sm border border-slate-700 shadow-xl">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white shadow-sm">
                  {previewUrl ? 'Click to change photo' : 'Drag & drop a photo, or click to browse'}
                </p>
                <p className="text-sm text-slate-400 drop-shadow-md">
                  Supports JPG, PNG (Max 10MB)
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

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-2">Issue Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="Pothole">Pothole</option>
                <option value="Water Leakage">Water Leakage</option>
                <option value="Garbage">Garbage</option>
                <option value="Streetlight">Streetlight</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the issue and exact location..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Location Indicator */}
          <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 mt-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            <span className="flex-1">{locationStatus}</span>
            <span className="font-mono text-xs opacity-70 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
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
                Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
