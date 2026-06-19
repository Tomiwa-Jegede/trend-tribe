// src/components/layout/PageTransition.jsx — Global route transition wrapper

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import {
  pageVariants,
  pageVariantsReduced,
  pageTransition,
} from "../../lib/motionVariants";

const PageTransition = ({ children }) => {
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const variants = prefersReduced ? pageVariantsReduced : pageVariants;

  return (
    <motion.div
      key={location.pathname}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={pageTransition}
      // Prevents transitions from affecting layout/scroll position
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
