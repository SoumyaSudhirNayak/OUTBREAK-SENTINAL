import React from 'react';
import { motion } from 'framer-motion';
import useOutbreakStore from '../store/outbreakStore';
import { MapPin } from 'lucide-react';

const getSeverityColorInfo = (severity) => {
    if (severity >= 80) return { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', label: 'CRITICAL', dot: 'bg-red-500' };
    if (severity >= 60) return { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', label: 'HIGH', dot: 'bg-orange-500' };
    if (severity >= 40) return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', label: 'MEDIUM', dot: 'bg-yellow-500' };
    return { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', label: 'LOW', dot: 'bg-blue-500' };
};

const SeverityItem = ({ outbreak, onSelect, isSelected }) => {
    const styles = getSeverityColorInfo(outbreak.severity);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelect(outbreak)}
            className={`relative overflow-hidden cursor-pointer rounded-xl p-4 transition-all duration-300 border ${isSelected
                    ? `${styles.border} bg-[#1e293b] shadow-[0_0_15px_rgba(0,0,0,0.5)]`
                    : 'border-[#ffffff10] bg-[#0f172a60] hover:bg-[#1e293b80]'
                }`}
        >
            {/* Background severity glow */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10 ${styles.bg}`}></div>

            <div className="flex justify-between items-start relative z-10">
                <div>
                    <h3 className="text-white font-medium flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${styles.dot} ${outbreak.severity >= 80 ? 'animate-ping' : ''}`}></div>
                        {outbreak.locationName}
                    </h3>
                    <p className="text-sm tracking-wide text-gray-400 mt-1">{outbreak.disease}</p>
                </div>
                <div className="text-right">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-[#00000040] ${styles.text}`}>
                        {styles.label}
                    </span>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 justify-end">
                        <MapPin size={10} /> {outbreak.affected} affected
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

const SeverityList = () => {
    const { outbreaks, selectedOutbreak, selectOutbreak } = useOutbreakStore();

    // Sort by severity descending
    const sortedOutbreaks = [...(outbreaks || [])].sort((a, b) => b.severity - a.severity);

    if (!sortedOutbreaks.length) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <div className="w-8 h-8 border-2 border-gray-700 border-t-[var(--neon-cyan)] rounded-full animate-spin mb-4"></div>
                <p className="text-sm uppercase tracking-widest animate-pulse">Scanning Global Data...</p>
            </div>
        );
    }

    return (
        <>
            {sortedOutbreaks.map((outbreak) => (
                <SeverityItem
                    key={outbreak.id}
                    outbreak={outbreak}
                    isSelected={selectedOutbreak?.id === outbreak.id}
                    onSelect={selectOutbreak}
                />
            ))}
        </>
    );
};

export default SeverityList;
