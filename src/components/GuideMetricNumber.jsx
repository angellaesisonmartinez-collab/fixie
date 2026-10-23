import { useEffect, useRef, useState } from 'react';

/**
 * Stat card number that mirrors the Dashboard loading behaviour.
 * - While `loading` is true it shows the pulsing "..." placeholder.
 * - When the count changes afterwards, it briefly shows "..." and then reveals
 *   the new count, so the old value never visibly flips to the new one.
 */
export default function GuideMetricNumber({
  value,
  loading = false,
  className = 'student-metric-number',
  delay = 450,
}) {
  const [shown, setShown] = useState(value);
  const [changing, setChanging] = useState(false);
  const prevValueRef = useRef(value);
  const prevLoadingRef = useRef(loading);

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;

    // Initial / explicit loading: just track the value silently
    if (loading || wasLoading) {
      prevValueRef.current = value;
      setShown(value);
      setChanging(false);
      return undefined;
    }

    if (prevValueRef.current === value) return undefined;
    prevValueRef.current = value;
    setChanging(true);
    const t = setTimeout(() => {
      setShown(value);
      setChanging(false);
    }, delay);
    return () => clearTimeout(t);
  }, [value, loading, delay]);

  if (loading || changing) {
    return (
      <span className={`${className} metric-number-loading`} aria-label="Loading metric">
        ...
      </span>
    );
  }
  return <span className={className}>{shown}</span>;
}
