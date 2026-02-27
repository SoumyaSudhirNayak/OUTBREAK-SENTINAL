import React from 'react';
import useOutbreakStore from '../store/outbreakStore';
import StatsCards from './StatsCards';
import SeverityList from './SeverityList';
import { Activity, ShieldAlert, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminSidebar = () => {
    const { realtimeUpdates, toggleRealtimeUpdates, summary } = useOutbreakStore();

    return (
        <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="h-full w-full glass-panel ui-interactive flex flex-col p-6 overflow-hidden border-r border-[#ffffff10]"
        >
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-wider text-white flex items-center gap-3">
                        <ShieldAlert className="text-[var(--neon-cyan)] animate-pulse" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            ORBITAL COMMAND
                        </span>
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 uppercase tracking-[0.2em]">Rural Health Logistics</p>
                </div>

                {/* Realtime Toggle */}
                <button
                    onClick={toggleRealtimeUpdates}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${realtimeUpdates
                            ? 'bg-[var(--neon-cyan-dim)] text-[var(--neon-cyan)] border border-[var(--neon-cyan)]'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                >
                    <Wifi size={14} className={realtimeUpdates ? 'animate-pulse' : ''} />
                    {realtimeUpdates ? 'Live Sync' : 'Paused'}
                </button>
            </div>

            <StatsCards summary={summary} />

            <div className="mt-8 flex-1 flex flex-col overflow-hidden">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={16} /> Active Outbreaks
                    <span className="ml-auto text-[var(--neon-cyan)] bg-[var(--neon-cyan-dim)] px-2 py-0.5 rounded-full text-[10px]">
                        {summary?.total || 0} TOTAL
                    </span>
                </h2>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-3">
                    <SeverityList />
                </div>
            </div>
        </motion.div>
    );
};

export default AdminSidebar;
