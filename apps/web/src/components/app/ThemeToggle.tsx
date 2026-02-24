import { motion, useReducedMotion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const isDark = resolvedTheme === 'dark';

  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      data-testid="theme-toggle"
      onClick={toggle}
      className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors ${isDark ? 'bg-neutral-700' : 'bg-primary/20'}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Current: ${theme === 'system' ? 'System' : resolvedTheme}. Click to toggle.`}
    >
      <motion.div
        className="absolute w-5 h-5 rounded-full bg-card shadow-sm flex items-center justify-center"
        animate={{ x: isDark ? 22 : 2 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
      >
        {isDark ? <Moon className="w-3 h-3 text-primary" /> : <Sun className="w-3 h-3 text-primary" />}
      </motion.div>
    </button>
  );
}
