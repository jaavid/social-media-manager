'use client';
import { motion, useReducedMotion } from 'framer-motion';

function reducedMotionElement(Component) {
  return function MotionElement(props) {
    const reduced = useReducedMotion();
    return <Component {...props} initial={reduced ? false : props.initial} whileHover={reduced ? undefined : props.whileHover} transition={reduced ? { ...props.transition, duration: 0 } : props.transition} />;
  };
}

export const MotionArticle = reducedMotionElement(motion.article);
export const MotionDiv = reducedMotionElement(motion.div);
export const MotionH1 = reducedMotionElement(motion.h1);
export const MotionP = reducedMotionElement(motion.p);
export const MotionSection = reducedMotionElement(motion.section);
export const MotionSpan = reducedMotionElement(motion.span);
