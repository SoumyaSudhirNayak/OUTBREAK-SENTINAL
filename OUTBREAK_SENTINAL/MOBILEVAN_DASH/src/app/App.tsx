import { useState, useEffect } from 'react';
import { Activity, MapPin, Package, Radio, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import Dashboard from './components/Dashboard';
import LiveRequests from './components/LiveRequests';
import Navigation from './components/Navigation';
import TreatmentStatus from './components/TreatmentStatus';
import Stock from './components/Stock';
import { listAssignmentsDetailed } from './utils/medicalVehicleApi';

type Tab = 'dashboard' | 'requests' | 'navigation' | 'treatment' | 'stock';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [syncActive, setSyncActive] = useState(true);
  const [routeAssigned, setRouteAssigned] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined);

  // Sync animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncActive(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = () => {
      const vehicleId = window.localStorage.getItem('mobilevan.vehicleId') ?? '';
      if (!vehicleId.trim()) {
        setPendingCount(undefined);
        return;
      }
      listAssignmentsDetailed(vehicleId.trim())
        .then((rows) => {
          const pending = rows.filter((r) => r.assignment_status === 'pending').length;
          setPendingCount(pending);
        })
        .catch(() => setPendingCount(undefined));
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRouteAccept = () => {
    setRouteAssigned(true);
    setActiveTab('navigation');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Toast Notifications */}
      <Toaster 
        position="top-center" 
        richColors 
        closeButton
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
          },
        }}
      />
      
      {/* Animated background blur circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Sync Status Badge */}
      <motion.div 
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-xl border"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          borderColor: syncActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)',
        }}
        animate={{
          boxShadow: syncActive 
            ? '0 0 20px rgba(34, 197, 94, 0.3)' 
            : '0 0 0px rgba(34, 197, 94, 0)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${syncActive ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-white">Live Sync {syncActive ? 'Active' : 'Standby'}</span>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="pb-20 md:pb-0 md:pl-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'requests' && <LiveRequests onRouteAccept={handleRouteAccept} routeAssigned={routeAssigned} />}
            {activeTab === 'navigation' && <Navigation />}
            {activeTab === 'treatment' && <TreatmentStatus />}
            {activeTab === 'stock' && <Stock />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation (Mobile) / Sidebar (Desktop) */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:right-auto md:w-20 z-40">
        <div 
          className="h-full backdrop-blur-2xl border-t md:border-r md:border-t-0"
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex md:flex-col h-full items-center justify-around md:justify-center md:gap-6 md:py-8">
            <NavItem
              icon={Activity}
              label="Dashboard"
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />
            <NavItem
              icon={Radio}
              label="Requests"
              active={activeTab === 'requests'}
              onClick={() => setActiveTab('requests')}
              badge={routeAssigned ? undefined : pendingCount}
            />
            <NavItem
              icon={MapPin}
              label="Navigation"
              active={activeTab === 'navigation'}
              onClick={() => setActiveTab('navigation')}
            />
            <NavItem
              icon={Stethoscope}
              label="Treatment"
              active={activeTab === 'treatment'}
              onClick={() => setActiveTab('treatment')}
            />
            <NavItem
              icon={Package}
              label="Stock"
              active={activeTab === 'stock'}
              onClick={() => setActiveTab('stock')}
            />
          </div>
        </div>
      </nav>
    </div>
  );
}

interface NavItemProps {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon: Icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-4 py-2 relative group transition-all"
    >
      <motion.div
        className="relative"
        whileTap={{ scale: 0.9 }}
      >
        <div
          className="p-3 rounded-2xl transition-all"
          style={{
            background: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            boxShadow: active ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none',
          }}
        >
          <Icon 
            className={`w-6 h-6 transition-colors ${
              active ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-300'
            }`}
          />
        </div>
        {badge !== undefined && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg shadow-red-500/50">
            {badge}
          </div>
        )}
      </motion.div>
      <span 
        className={`text-xs font-medium transition-colors ${
          active ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-300'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
