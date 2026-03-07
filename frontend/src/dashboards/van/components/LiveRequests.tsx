import { useEffect, useMemo, useState } from 'react';
import { MapPin, Users, Clock, Navigation2, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import GlassCard from './GlassCard';
import { acceptAssignment, listAssignmentsDetailed, resolveVehicleId, type VehicleAssignmentDetailed } from '../utils/medicalVehicleApi';

type Request = {
  id: string;
  outbreakId: string;
  location: string;
  disease: string;
  severity: 'critical' | 'moderate' | 'low';
  patients: number;
  status: 'assigned' | 'in-progress' | 'completed';
};

interface LiveRequestsProps {
  onRouteAccept: () => void;
  routeAssigned: boolean;
}

export default function LiveRequests({ onRouteAccept }: LiveRequestsProps) {
  const [vehicleId, setVehicleId] = useState<string>(() => window.localStorage.getItem('mobilevan.vehicleId') ?? '');
  const [assignments, setAssignments] = useState<VehicleAssignmentDetailed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveVehicleId(vehicleId)
      .then((id) => {
        if (id && id !== vehicleId) setVehicleId(id);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const id = vehicleId.trim();
    if (!id) {
      setAssignments([]);
      return;
    }
    window.localStorage.setItem('mobilevan.vehicleId', id);
    setLoading(true);
    setError(null);
    listAssignmentsDetailed(id)
      .then((rows) => setAssignments(rows))
      .catch((e: any) => setError(e?.message ?? 'Failed to load assignments'))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  const requests = useMemo<Request[]>(() => {
    const mapSeverity = (s: any): Request['severity'] => (s === 'severe' ? 'critical' : s === 'moderate' ? 'moderate' : 'low');
    const mapStatus = (s: any): Request['status'] => (s === 'completed' ? 'completed' : s === 'accepted' ? 'in-progress' : 'assigned');
    return assignments.map((a) => {
      const ob = a.outbreak;
      return {
        id: a.id,
        outbreakId: a.outbreak_id,
        location: ob?.area_name ?? (ob ? `${ob.latitude.toFixed(4)}, ${ob.longitude.toFixed(4)}` : 'Unknown location'),
        disease: ob?.disease_type ?? `Outbreak ${a.outbreak_id}`,
        severity: mapSeverity(ob?.severity),
        patients: ob?.affected_people ?? 0,
        status: mapStatus(a.assignment_status),
      };
    });
  }, [assignments]);

  const handleStartAssignment = (assignmentId: string, outbreakId: string, location: string) => {
    const id = vehicleId.trim();
    if (!id) return;
    acceptAssignment(assignmentId)
      .then(() => {
        window.localStorage.setItem('mobilevan.activeOutbreakId', outbreakId);
        toast.success('Assignment Accepted – Navigating to Route', { description: `En route to ${location}`, duration: 3000 });
        onRouteAccept();
        return listAssignmentsDetailed(id).then((rows) => setAssignments(rows));
      })
      .catch((e: any) => toast.error(e?.message ?? 'Failed to accept assignment'));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'rgba(239, 68, 68, 0.2)',
          border: 'rgba(239, 68, 68, 0.3)',
          text: 'text-red-400',
          glow: '0 0 20px rgba(239, 68, 68, 0.4)',
        };
      case 'moderate':
        return {
          bg: 'rgba(251, 146, 60, 0.2)',
          border: 'rgba(251, 146, 60, 0.3)',
          text: 'text-orange-400',
          glow: '0 0 20px rgba(251, 146, 60, 0.3)',
        };
      case 'low':
        return {
          bg: 'rgba(34, 197, 94, 0.2)',
          border: 'rgba(34, 197, 94, 0.3)',
          text: 'text-green-400',
          glow: '0 0 20px rgba(34, 197, 94, 0.3)',
        };
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          text: 'text-gray-400',
          glow: 'none',
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return {
          bg: 'rgba(59, 130, 246, 0.2)',
          border: 'rgba(59, 130, 246, 0.4)',
          text: 'text-blue-400',
          label: 'Assigned',
          glow: 'none',
        };
      case 'in-progress':
        return {
          bg: 'rgba(34, 197, 94, 0.2)',
          border: 'rgba(34, 197, 94, 0.4)',
          text: 'text-green-400',
          label: 'In Progress',
          glow: '0 0 20px rgba(34, 197, 94, 0.3)',
        };
      case 'completed':
        return {
          bg: 'rgba(100, 116, 139, 0.2)',
          border: 'rgba(100, 116, 139, 0.3)',
          text: 'text-gray-400',
          label: 'Completed',
          glow: 'none',
        };
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          text: 'text-gray-400',
          label: 'Unknown',
          glow: 'none',
        };
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Incoming Assignments</h1>
        <p className="text-gray-400">Real-time outbreak alerts</p>
      </motion.div>

      {/* AI Auto-Allocation Banner */}
      <GlassCard className="mb-6" glow glowColor="rgba(99, 102, 241, 0.2)">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/20">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              Assignments are auto-allocated by AI and Admin Control
              <span className="px-2 py-1 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-bold">AI</span>
            </h3>
            <p className="text-sm text-gray-400">Routes optimized by severity, distance, and patient count</p>
          </div>
        </div>
      </GlassCard>

      {/* Request Cards */}
      <div className="space-y-4">
        <GlassCard className="mb-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-300">Vehicle ID (to load your assignments)</div>
            <input
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full md:w-[420px] rounded-xl px-3 py-2 text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              placeholder="Paste vehicle UUID"
            />
          </div>
          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
          {loading && <div className="mt-3 text-sm text-gray-400">Loading assignments…</div>}
        </GlassCard>

        {!loading && requests.length === 0 && vehicleId.trim() && (
          <GlassCard>
            <div className="text-gray-300">No assignments for this vehicle yet.</div>
          </GlassCard>
        )}

        {requests.map((request, index) => {
          const severityStyle = getSeverityColor(request.severity);
          const statusBadge = getStatusBadge(request.status);
          
          return (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard 
                hover={request.status === 'assigned'}
                className={request.status === 'completed' ? 'opacity-60' : ''}
              >
                <div className="flex flex-col gap-4">
                  {/* Header Row with Status Badge */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-blue-400" />
                        <h3 className="text-xl font-bold text-white">{request.location}</h3>
                      </div>
                      <p className="text-gray-300 font-medium mb-3">{request.disease}</p>
                    </div>

                    {/* Status Badge */}
                    <motion.div
                      className="px-4 py-2 rounded-full text-sm font-bold border"
                      style={{
                        background: statusBadge.bg,
                        borderColor: statusBadge.border,
                        boxShadow: statusBadge.glow,
                      }}
                      animate={
                        request.status === 'in-progress'
                          ? {
                              boxShadow: [
                                '0 0 20px rgba(34, 197, 94, 0.3)',
                                '0 0 30px rgba(34, 197, 94, 0.5)',
                                '0 0 20px rgba(34, 197, 94, 0.3)',
                              ],
                            }
                          : {}
                      }
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className={statusBadge.text}>
                        {request.status === 'in-progress' && (
                          <CheckCircle2 className="w-4 h-4 inline mr-2" />
                        )}
                        {statusBadge.label.toUpperCase()}
                      </span>
                    </motion.div>
                  </div>

                  {/* Priority Badge */}
                  <div className="inline-block">
                    <motion.div
                      className="px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide border"
                      style={{
                        background: severityStyle.bg,
                        borderColor: severityStyle.border,
                        boxShadow: request.severity === 'critical' ? severityStyle.glow : 'none',
                      }}
                      animate={
                        request.severity === 'critical'
                          ? {
                              boxShadow: [
                                '0 0 20px rgba(239, 68, 68, 0.4)',
                                '0 0 30px rgba(239, 68, 68, 0.6)',
                                '0 0 20px rgba(239, 68, 68, 0.4)',
                              ],
                            }
                          : {}
                      }
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className={severityStyle.text}>
                        {request.severity === 'critical' && (
                          <AlertTriangle className="w-4 h-4 inline mr-2" />
                        )}
                        {request.severity.toUpperCase()} PRIORITY
                      </span>
                    </motion.div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-400">Patients</p>
                        <p className="text-lg font-bold text-white">{request.patients}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Navigation2 className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-400">Distance</p>
                        <p className="text-lg font-bold text-white">—</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-400">ETA</p>
                        <p className="text-lg font-bold text-white">—</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="w-full">
                    {request.status === 'assigned' ? (
                      <motion.button
                        onClick={() => handleStartAssignment(request.id, request.outbreakId, request.location)}
                        className="w-full py-3 md:py-4 px-6 rounded-2xl font-semibold text-white transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                        }}
                        whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Accept Assignment
                      </motion.button>
                    ) : request.status === 'in-progress' ? (
                      <div className="w-full py-3 md:py-4 px-6 rounded-2xl font-semibold flex items-center justify-center gap-2 text-green-400 border border-green-500/30 bg-green-500/10">
                        <CheckCircle2 className="w-5 h-5" />
                        En Route - View Navigation
                      </div>
                    ) : (
                      <div className="w-full py-3 md:py-4 px-6 rounded-2xl font-semibold flex items-center justify-center gap-2 text-gray-400 border border-gray-500/30 bg-gray-500/10">
                        <CheckCircle2 className="w-5 h-5" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
