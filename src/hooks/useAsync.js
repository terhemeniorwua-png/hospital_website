'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async fetcher and exposes the four states every data view needs:
 * `data`, `loading`, `error` and a manual `reload`.
 */
export function useAsync(fetcher, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    mounted.current = true;
    fetcherRef.current = fetcher;
    return () => {
      mounted.current = false;
    };
  });

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (mounted.current) setData(result);
      return result;
    } catch (caught) {
      if (mounted.current) setError(caught);
      return undefined;
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!immediate) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, immediate]);

  return { data, setData, error, loading, reload: run };
}

/** Wraps a submit handler with pending state and error capture. */
export function useSubmit(handler) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const submit = useCallback(
    async (...args) => {
      setPending(true);
      setError(null);
      try {
        return await handler(...args);
      } catch (caught) {
        if (mounted.current) setError(caught);
        throw caught;
      } finally {
        if (mounted.current) setPending(false);
      }
    },
    [handler],
  );

  return { submit, pending, error, setError };
}

/** Debounces fast-changing values (search inputs, filters). */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** SSR-safe media query hook. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const listener = (event) => setMatches(event.matches);
    list.addEventListener('change', listener);
    return () => list.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

/** Tracks an element's intersection for scroll-reveal animations. */
export function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px', ...options });
    observer.observe(node);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]); // eslint-disable-line react-hooks/exhaustive-deps

  return [ref, inView];
}
