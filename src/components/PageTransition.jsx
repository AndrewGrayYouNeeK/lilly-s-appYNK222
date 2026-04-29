import React from 'react';
import { motion } from 'framer-motion';

/**
 * Lightweight slide+fade transition wrapper for routed pages.
 * Used together with AnimatePresence in App.jsx.
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}