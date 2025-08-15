// frontend/src/components/PerformanceMonitor.jsx
import { useState, useEffect, useRef } from 'react';
import { httpCache } from '../lib/http';

export default function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState({
    cacheSize: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgResponseTime: 0
  });
  
  const responseTimes = useRef([]);
  const cacheHits = useRef(0);
  const cacheMisses = useRef(0);

  // Track response times
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const end = performance.now();
        responseTimes.current.push(end - start);
        
        // Keep only last 100 measurements
        if (responseTimes.current.length > 100) {
          responseTimes.current.shift();
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Update metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const avgResponseTime = responseTimes.current.length > 0 
        ? responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length 
        : 0;

      setMetrics({
        cacheSize: httpCache.size(),
        cacheHits: cacheHits.current,
        cacheMisses: cacheMisses.current,
        avgResponseTime: Math.round(avgResponseTime)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cache hit/miss tracking (this would need to be integrated with the http utility)
  useEffect(() => {
    // Listen for custom events from the http utility
    const handleCacheHit = () => cacheHits.current++;
    const handleCacheMiss = () => cacheMisses.current++;

    window.addEventListener('cache-hit', handleCacheHit);
    window.addEventListener('cache-miss', handleCacheMiss);

    return () => {
      window.removeEventListener('cache-hit', handleCacheHit);
      window.removeEventListener('cache-miss', handleCacheMiss);
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="btn primary"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-round)',
          fontSize: '12px',
          fontWeight: '600',
          zIndex: 1000
        }}
        title="Show Performance Monitor"
      >
        PM
      </button>
    );
  }

  return (
    <div
      className="card"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        minWidth: '250px',
        zIndex: 1000
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Performance Monitor</h4>
        <button
          onClick={() => setIsVisible(false)}
          className="btn"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            color: 'var(--muted)',
            padding: '4px 8px',
            minWidth: 'auto'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Cache Size:</span>
          <span style={{ fontWeight: '600' }}>{metrics.cacheSize}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Cache Hit Rate:</span>
          <span style={{ fontWeight: '600' }}>
            {metrics.cacheHits + metrics.cacheMisses > 0 
              ? Math.round((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100)
              : 0}%
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Avg Response:</span>
          <span style={{ fontWeight: '600' }}>{metrics.avgResponseTime}ms</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span>Total Requests:</span>
          <span style={{ fontWeight: '600' }}>{metrics.cacheHits + metrics.cacheMisses}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => {
            httpCache.clear();
            cacheHits.current = 0;
            cacheMisses.current = 0;
            responseTimes.current = [];
          }}
          className="btn"
          style={{
            background: '#ef4444',
            color: 'white',
            fontSize: '11px',
            padding: '4px 8px'
          }}
        >
          Clear Cache
        </button>
        <button
          onClick={() => {
            cacheHits.current = 0;
            cacheMisses.current = 0;
            responseTimes.current = [];
          }}
          className="btn"
          style={{
            background: '#6b7280',
            color: 'white',
            fontSize: '11px',
            padding: '4px 8px'
          }}
        >
          Reset Stats
        </button>
      </div>
    </div>
  );
}
