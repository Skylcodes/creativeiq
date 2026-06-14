"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

export const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export function FadeUp({
  delay = 0,
  duration = 0.5,
  className,
  children,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; duration?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE_PREMIUM }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({
  className,
  children,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  className,
  children,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.45, ease: EASE_PREMIUM }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
