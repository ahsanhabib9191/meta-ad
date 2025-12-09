/**
 * Performance monitoring utilities
 * 
 * This module provides utilities for tracking and logging slow operations
 * to help identify performance bottlenecks.
 */

import logger from './logger';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  metadata?: Record<string, any>;
}

const SLOW_OPERATION_THRESHOLD_MS = 1000; // Log operations taking more than 1 second

// NOTE: This array is not thread-safe. In worker threads scenarios, consider using
// a thread-safe data structure or separate metrics collection per thread.
const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS_IN_MEMORY = 1000;

/**
 * Measure the execution time of an async operation
 * 
 * @param operation - Name of the operation being measured
 * @param fn - Async function to execute and measure
 * @param metadata - Optional metadata to log with slow operations
 * @returns Result of the function execution
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    // Log slow operations
    if (duration > SLOW_OPERATION_THRESHOLD_MS) {
      logger.warn('Slow operation detected', {
        operation,
        duration,
        threshold: SLOW_OPERATION_THRESHOLD_MS,
        ...metadata,
      });
    }
    
    // Store metric (with circular buffer to prevent memory growth)
    const metric: PerformanceMetric = { operation, duration, metadata };
    performanceMetrics.push(metric);
    if (performanceMetrics.length > MAX_METRICS_IN_MEMORY) {
      performanceMetrics.shift();
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Operation failed', {
      operation,
      duration,
      error,
      ...metadata,
    });
    throw error;
  }
}

/**
 * Get performance statistics for operations
 * 
 * @param operation - Optional operation name to filter by
 * @returns Performance statistics
 */
export function getPerformanceStats(operation?: string): {
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
} {
  const metrics = operation
    ? performanceMetrics.filter((m) => m.operation === operation)
    : performanceMetrics;

  if (metrics.length === 0) {
    return {
      count: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      p95Duration: 0,
    };
  }

  const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
  const sum = durations.reduce((acc, d) => acc + d, 0);
  const p95Index = Math.floor(durations.length * 0.95);

  return {
    count: metrics.length,
    avgDuration: sum / metrics.length,
    minDuration: durations[0],
    maxDuration: durations[durations.length - 1],
    p95Duration: durations[p95Index] || 0,
  };
}

/**
 * Clear performance metrics from memory
 */
export function clearPerformanceMetrics(): void {
  performanceMetrics.length = 0;
}

/**
 * Create a performance monitoring decorator for class methods
 * 
 * @param operation - Name of the operation
 * @returns Method decorator
 */
export function monitored(operation: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return measurePerformance(
        operation,
        () => originalMethod.apply(this, args),
        { method: propertyKey }
      );
    };

    return descriptor;
  };
}
