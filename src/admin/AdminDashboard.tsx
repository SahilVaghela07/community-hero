import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, AlertTriangle, MapPin, Play, CheckCircle2 } from 'lucide-react';

interface Issue {
  id: number;
  category: string;
  severity: string;
  description: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  created_at: string;
}

export const AdminDashboard: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/issues');
      if (response.data.success) {
        setIssues(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load issues.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await axios.patch(`/api/issues/${id}/status`, { status: newStatus });
      setIssues(issues.map(issue => 
        issue.id === id ? { ...issue, status: newStatus } : issue
      ));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const openMap = (lat?: number, lng?: number) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      alert('Location data is not available for this issue.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl max-w-2xl mx-auto flex gap-3 text-sm items-start mt-8">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  const pendingIssues = issues.filter(i => i.status === 'Pending');
  const workingIssues = issues.filter(i => i.status === 'Working');
  const completedIssues = issues.filter(i => i.status === 'Completed');

  const Column = ({ title, statusIssues, nextStatus, nextStatusLabel, Icon }: any) => (
    <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 h-[calc(100vh-12rem)] min-w-[320px]">
      <div className="p-4 border-b border-slate-800 bg-slate-900 rounded-t-2xl sticky top-0 z-10 flex justify-between items-center">
        <h3 className="font-semibold text-slate-200">{title}</h3>
        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
          {statusIssues.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
        {statusIssues.map((issue: Issue) => (
          <div key={issue.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-slate-600 transition-colors flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <span className="px-2 py-1 bg-slate-900 text-slate-300 border border-slate-700 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                {issue.category}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {new Date(issue.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed">
              {issue.description}
            </p>

            <button
              onClick={() => openMap(issue.latitude, issue.longitude)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors w-fit p-1 -ml-1 rounded hover:bg-blue-500/10"
            >
              <MapPin className="w-3.5 h-3.5" />
              View on Map
            </button>

            {nextStatus && (
              <div className="pt-3 mt-1 border-t border-slate-700/50">
                <button
                  onClick={() => updateStatus(issue.id, nextStatus)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-xs font-medium"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {nextStatusLabel}
                </button>
              </div>
            )}
          </div>
        ))}

        {statusIssues.length === 0 && (
          <div className="text-center py-10 px-4 text-slate-500 text-sm">
            No issues in this column.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 px-4 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Ticket Lifecycle Board</h2>
        <button onClick={fetchIssues} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
          Refresh Board
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        <Column 
          title="Pending" 
          statusIssues={pendingIssues} 
          nextStatus="Working" 
          nextStatusLabel="Start Work" 
          Icon={Play}
        />
        <Column 
          title="Working" 
          statusIssues={workingIssues} 
          nextStatus="Completed" 
          nextStatusLabel="Complete" 
          Icon={CheckCircle2}
        />
        <Column 
          title="Completed" 
          statusIssues={completedIssues} 
          nextStatus={null} 
          nextStatusLabel="" 
          Icon={null}
        />
      </div>
    </div>
  );
};
