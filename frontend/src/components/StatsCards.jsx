import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Users, Ambulance, Activity } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass, delay }) => (
    <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay }}
        className="bg-[#0f172a80] border border-[#ffffff10] rounded-xl p-4 flex items-center gap-4 hover:bg-[#1e293b80] transition-colors"
    >
        <div className={`p-3 rounded-lg bg-[${colorClass}20] text-white flex-shrink-0 ${colorClass === 'var(--neon-cyan)' ? 'glow-cyan' : ''}`}>
            <Icon size={24} style={{ color: colorClass.startsWith('var') ? colorClass : colorClass }} />
        </div>
        <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
    </motion.div>
);

const StatsCards = ({ summary }) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <StatCard
                title="Critical Zones"
                value={summary?.critical || 0}
                icon={AlertTriangle}
                colorClass="#ef4444"
                delay={0.1}
            />
            <StatCard
                title="High Risk"
                value={summary?.high || 0}
                icon={Activity}
                colorClass="#f97316"
                delay={0.2}
            />
            <StatCard
                title="Active Units"
                value="24 / 30"
                icon={Ambulance}
                colorClass="var(--neon-cyan)"
                delay={0.3}
            />
            <StatCard
                title="Pop. Risked"
                value={summary ? (summary.total * 85).toLocaleString() : 0}
                icon={Users}
                colorClass="#3b82f6"
                delay={0.4}
            />
        </div>
    );
};

export default StatsCards;
