// frontend/src/hooks/useOptimizedFetch.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { http, httpCache } from '../lib/http';

export function useOptimizedFetch(apiCall, dependencies = [], options = {}) {
  const {
    immediate = true,
    backgroundRefresh: enableBackgroundRefresh = true,
    backgroundRefreshInterval = 30000, // 30 seconds
    cacheKey,
    staleTime = 60000, // 1 minute
    ...fetchOptions
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  
  const abortControllerRef = useRef(null);
  const backgroundTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }

    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const result = await apiCall();
      
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setLastFetched(Date.now());
        
        // Cache the result if cacheKey is provided
        if (cacheKey) {
          httpCache.set(cacheKey, result);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        setError(err.message);
        if (!isBackground) {
          setData(null);
        }
      }
    } finally {
      if (!isBackground && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [apiCall, cacheKey]);

  const refresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  const backgroundRefresh = useCallback(() => {
    if (backgroundRefresh && lastFetched && Date.now() - lastFetched > staleTime) {
      fetchData(true);
    }
  }, [backgroundRefresh, lastFetched, staleTime, fetchData]);

  // Initial fetch
  useEffect(() => {
    if (immediate) {
      fetchData(false);
    }
  }, [immediate, fetchData]);

  // Background refresh setup
  useEffect(() => {
    if (backgroundRefresh && backgroundRefreshInterval > 0) {
      backgroundTimerRef.current = setInterval(backgroundRefresh, backgroundRefreshInterval);
      
      return () => {
        if (backgroundTimerRef.current) {
          clearInterval(backgroundTimerRef.current);
        }
      };
    }
  }, [backgroundRefresh, backgroundRefreshInterval, backgroundRefresh]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (backgroundTimerRef.current) {
        clearInterval(backgroundTimerRef.current);
      }
    };
  }, []);

  // Dependency-based refresh
  useEffect(() => {
    if (dependencies.length > 0) {
      refresh();
    }
  }, dependencies);

  return {
    data,
    loading,
    error,
    refresh,
    lastFetched,
    isStale: lastFetched !== null && lastFetched !== undefined ? (Date.now() - lastFetched > staleTime) : true
  };
}

// Specialized hook for articles with pagination
export function useArticlesList(token, options = {}) {
  const {
    page = 1,
    limit = 30,
    search = "",
    tag = "",
    immediate = true
  } = options;

  const apiCall = useCallback(async () => {
    const params = new URLSearchParams({ 
      page: String(page), 
      limit: String(limit), 
      q: search, 
      tag 
    });
    return http(`/articles?${params.toString()}`, { token });
  }, [token, page, limit, search, tag]);

  return useOptimizedFetch(apiCall, [page, limit, search, tag], {
    immediate,
    backgroundRefresh: false, // Articles don't need background refresh
    staleTime: 300000, // 5 minutes for articles
    ...options
  });
}

// Specialized hook for daily digest
export function useDailyDigest(token, date, options = {}) {
  const {
    length = "detailed",
    immediate = true
  } = options;

  const apiCall = useCallback(async () => {
    return http(`/digests/${date}`, { token });
  }, [token, date]);

  return useOptimizedFetch(apiCall, [date], {
    immediate,
    backgroundRefresh: true,
    backgroundRefreshInterval: 60000, // 1 minute for digest
    staleTime: 300000, // 5 minutes
    ...options
  });
}
