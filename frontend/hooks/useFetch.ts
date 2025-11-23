import { useState, useEffect } from 'react';

/**
 * Custom hook for fetching data from API endpoints
 * 
 * @template T - The type of data being fetched
 * @param url - The API endpoint URL to fetch from
 * @returns Object containing data, loading state, and error (if any)
 * 
 * @example
 * const { data, loading, error } = useFetch('/api/v1/trades/list');
 */
interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export default function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Track if component is still mounted to prevent memory leaks
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from API
        const response = await fetch(url);

        // Check if response is successful
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        // Parse JSON response
        const result = await response.json();

        // Only update state if component is still mounted
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        // Only update state if component is still mounted
        if (isMounted) {
          setError((err as Error).message);
          setData(null);
          console.error('Fetch error:', err);
        }
      } finally {
        // Always set loading to false when done
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Only fetch if URL is provided and not empty
    if (url) {
      fetchData();
    } else {
      setLoading(false);
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [url]); // Re-fetch when URL changes

  return { data, loading, error };
}