import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Returns true for `delay` ms whenever the combined stat key changes, so ALL
 * stat cards on a page can show the loading placeholder together while any
 * one of them is updating. While `paused` (initial load) it tracks silently.
 */
export function useStatsRefresh(key, paused = false, delay = 1000) {
  const [refreshing, setRefreshing] = useState(false);
  const prevRef = useRef(key);

  useLayoutEffect(() => {
    if (paused) {
      prevRef.current = key;
      setRefreshing(false);
      return undefined;
    }
    if (prevRef.current === key) return undefined;
    prevRef.current = key;
    setRefreshing(true);
    const t = setTimeout(() => setRefreshing(false), delay);
    return () => clearTimeout(t);
  }, [key, paused, delay]);

  return refreshing;
}

/**
 * Stat card number that mirrors the Dashboard loading behaviour.
 * - While `loading` is true it shows the pulsing "..." placeholder.
 * - When its own count changes it briefly shows "..." and then reveals the
 *   new count, so the old value never visibly flips to the new one.
 */
export default function GuideMetricNumber({
  value,
  loading = false,
  className = 'student-metric-number',
  delay = 1000,
}) {
  const [shown, setShown] = useState(value);
  const [changing, setChanging] = useState(false);
  const prevValueRef = useRef(value);
  const prevLoadingRef = useRef(loading);

  // Layout effect so the new value is never painted before the placeholder
  useLayoutEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;

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
