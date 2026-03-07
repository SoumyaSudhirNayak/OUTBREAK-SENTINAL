import { useState } from 'react';
import { User, LogOut, Activity, LayoutDashboard, Heart } from 'lucide-react';
import { DashboardTab } from './components/DashboardTab';
import { TreatmentStatusTab } from './components/TreatmentStatusTab';
import { LocalResourcesTab } from './components/LocalResourcesTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'treatment' | 'resources'>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'treatment' as const, label: 'Treatment Status', icon: Activity },
    { id: 'resources' as const, label: 'Local Resources', icon: Heart },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: 'Inter, sans-serif',
        background: 'linear-gradient(135deg, #060b1a 0%, #0d1530 30%, #0a1628 60%, #0b1a3e 100%)',
      }}
    >
      {/* Ambient background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: '600px',
            height: '600px',
            top: '-200px',
            left: '-150px',
            background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '500px',
            height: '500px',
            top: '40%',
            right: '-100px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '400px',
            height: '400px',
            bottom: '-100px',
            left: '30%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Top Bar */}
      <header
        className="relative z-10 border-b"
        style={{
          background: 'rgba(6, 11, 26, 0.8)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.06)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #2563EB, #4f46e5)',
                  boxShadow: '0 0 20px rgba(37,99,235,0.5), 0 0 40px rgba(37,99,235,0.2)',
                }}
              >
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>
                  Doctor Reporting Panel
                </h1>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Rural Health Sentinel System
                </p>
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div
                className="hidden items-center gap-2 rounded-full px-3 py-1.5 sm:flex"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-green-400"
                  style={{ boxShadow: '0 0 6px rgba(34,197,94,0.8)' }}
                />
                <span className="text-xs font-medium text-green-400">Live</span>
              </div>

              {/* Profile */}
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #4f46e5)' }}
                >
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Dr. Kumar
                </span>
              </div>

              {/* Logout */}
              <button
                className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all hover:bg-white/10"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden text-sm sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div
        className="relative z-10 border-b"
        style={{
          background: 'rgba(6, 11, 26, 0.6)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all"
                  style={{
                    color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #2563EB, #818cf8)',
                        boxShadow: '0 0 8px rgba(37,99,235,0.8)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'treatment' && <TreatmentStatusTab />}
        {activeTab === 'resources' && <LocalResourcesTab />}
      </main>
    </div>
  );
}
