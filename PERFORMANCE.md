# Performance Enhancements for MyJournal

This document outlines the performance optimizations implemented to enhance the fetching performance of daily brief and articles.

## 🚀 Key Performance Improvements

### 1. Smart HTTP Caching System
- **5-minute cache TTL** for GET requests
- **Request deduplication** to prevent duplicate API calls
- **Automatic cache cleanup** every minute
- **Cache hit/miss tracking** for performance monitoring

### 2. Optimized Data Fetching Hooks
- **`useOptimizedFetch`** - Generic hook with background refresh
- **`useArticlesList`** - Specialized for articles with pagination
- **`useDailyDigest`** - Specialized for daily digest with auto-refresh

### 3. Background Data Refresh
- **Smart stale detection** (configurable stale time)
- **Background refresh intervals** (30s default, 1min for digest)
- **Non-blocking updates** - show cached data immediately
- **Progress indicators** for refresh operations

### 4. Search Optimization
- **Debounced search** (300ms delay) to reduce API calls
- **Smart pagination** with cached results
- **Diversity filtering** to avoid source overload

### 5. Performance Monitoring
- **Real-time metrics** display
- **Cache hit rate** tracking
- **Average response time** monitoring
- **Request count** statistics

## 📊 Performance Metrics

### Cache Performance
- Cache hit rate target: >80%
- Cache TTL: 5 minutes
- Background refresh: 30s-1min intervals

### Response Time Targets
- Cached responses: <10ms
- Fresh API calls: <500ms
- Background refresh: Non-blocking

## 🔧 Implementation Details

### HTTP Utility (`src/lib/http.js`)
```javascript
// Enhanced with caching and deduplication
export async function http(path, { 
  method="GET", 
  token, 
  body, 
  cache: useCache = true, 
  dedupe = true 
} = {})
```

### Custom Hooks (`src/hooks/useOptimizedFetch.js`)
```javascript
// Generic optimized fetching
export function useOptimizedFetch(apiCall, dependencies = [], options = {})

// Specialized hooks
export function useArticlesList(token, options = {})
export function useDailyDigest(token, date, options = {})
```

### Performance Monitor (`src/components/PerformanceMonitor.jsx`)
- Floating performance dashboard
- Real-time metrics display
- Cache management controls
- Performance reset options

## 📈 Usage Examples

### Daily Brief with Background Refresh
```javascript
const { 
  data, 
  loading, 
  error, 
  refresh, 
  isStale 
} = useDailyDigest(token, todayUTC(), {
  immediate: !!token,
  backgroundRefresh: true,
  backgroundRefreshInterval: 60000, // 1 minute
  staleTime: 300000 // 5 minutes
});
```

### Articles List with Caching
```javascript
const { 
  data, 
  loading, 
  error, 
  refresh 
} = useArticlesList(token, {
  page,
  limit,
  search: q,
  immediate: !!token,
  backgroundRefresh: false,
  staleTime: 300000 // 5 minutes
});
```

## 🎯 Performance Targets

### Daily Brief
- **Initial load**: <200ms (cached)
- **Background refresh**: Non-blocking
- **Auto-generation**: <2s for new digests

### Articles List
- **Search response**: <300ms (debounced)
- **Pagination**: <100ms (cached)
- **Source filtering**: Instant (client-side)

### Overall App
- **Cache hit rate**: >80%
- **Average response time**: <200ms
- **Background refresh**: Non-blocking
- **Memory usage**: <50MB cache

## 🔍 Monitoring & Debugging

### Performance Monitor
- Click the 📊 button (bottom-right) to show metrics
- Monitor cache hit rates and response times
- Clear cache or reset stats as needed

### Browser DevTools
- Network tab: Monitor API calls and caching
- Performance tab: Track response times
- Application tab: View cache storage

### Console Logging
- Cache operations are logged for debugging
- Performance metrics available via `httpCache` utility

## 🚨 Troubleshooting

### High Cache Miss Rate
- Check if cache TTL is too short
- Verify request deduplication is working
- Monitor for excessive API calls

### Slow Response Times
- Check network conditions
- Verify cache is being used
- Monitor background refresh frequency

### Memory Issues
- Cache size is limited to prevent memory leaks
- Automatic cleanup runs every minute
- Manual cache clearing available

## 🔮 Future Enhancements

### Planned Optimizations
- **Service Worker** for offline caching
- **IndexedDB** for persistent storage
- **WebSocket** for real-time updates
- **GraphQL** for optimized queries
- **CDN integration** for static assets

### Advanced Features
- **Predictive prefetching** based on user behavior
- **Intelligent cache invalidation** strategies
- **Performance budgets** and alerts
- **A/B testing** for optimization strategies

## 📚 Best Practices

### For Developers
1. Use the specialized hooks (`useArticlesList`, `useDailyDigest`)
2. Set appropriate `staleTime` for your data type
3. Enable `backgroundRefresh` for frequently changing data
4. Monitor performance metrics in development

### For Users
1. Allow background refresh for fresh content
2. Use search with natural typing (debounced)
3. Monitor performance indicators (stale/fresh badges)
4. Report performance issues for optimization

---

*Performance enhancements implemented with React 18, modern JavaScript, and optimized HTTP patterns.*
