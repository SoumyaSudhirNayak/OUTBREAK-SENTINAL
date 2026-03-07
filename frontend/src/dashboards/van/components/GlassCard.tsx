import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  glowColor?: string;
}

export default function GlassCard({ children, className = '', hover = false, glow = false, glowColor }: GlassCardProps) {
  const glowStyle = glow
    ? {
        boxShadow: `0 0 20px ${glowColor || 'rgba(59, 130, 246, 0.1)'}`,
      }
    : {};

  return (
    <motion.div
      className={`p-6 rounded-2xl backdrop-blur-xl border ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...glowStyle,
      }}
      whileHover={
        hover
          ? {
              scale: 1.02,
              boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)',
            }
          : undefined
      }
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
