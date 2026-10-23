import { useEffect, useRef, useState } from 'react';

/**
 * Stat card number that mirrors the Dashboard loading behaviour:
 * when the count changes, show the "..." loading placeholder briefly and then
 * reveal the new count, so the old value never visibly flips to the new one.
 */
export default function GuideMetricNumber({ value, delay = 450 }) {
  const [shown, setShown] = useState(value);
  const [loading, setLoading] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return undefined;
    prevRef.current = value;
    setLoading(true);
    const t = setTimeout(() => {
      setShown(value);
      setLoading(false);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  if (loading) {
    return (
      <span className="student-metric-number guide-metric-loading" aria-label="Loading metric">
        ...
      </span>
    );
  }
  return <span className="student-metric-number">{shown}</span>;
}
