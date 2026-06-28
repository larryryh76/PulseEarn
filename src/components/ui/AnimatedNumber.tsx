import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface Props {
  value: number;
  className?: string;
  formatter?: (val: number) => string;
}

const AnimatedNumber: React.FC<Props> = ({ value, className, formatter = (v) => Math.floor(v).toLocaleString() }) => {
  const springValue = useSpring(value, {
    mass: 1,
    stiffness: 100,
    damping: 30,
  });

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  const displayValue = useTransform(springValue, (current) => formatter(current));

  return (
    <motion.span className={className}>
      {displayValue}
    </motion.span>
  );
};

export default AnimatedNumber;
