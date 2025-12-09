/**
 * Batch operation utilities for improved performance
 * 
 * This module provides utilities for batching database operations
 * to reduce round-trips and improve throughput.
 */

import { Model, Document } from 'mongoose';
import logger from './logger';

export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: Error }>;
}

/**
 * Batch upsert operations using bulkWrite for better performance
 * 
 * @param model - Mongoose model to operate on
 * @param operations - Array of upsert operations
 * @param batchSize - Size of each batch (default: 100)
 * @returns Result with counts of successful and failed operations
 */
export async function batchUpsert<T extends Document>(
  model: Model<T>,
  operations: Array<{ filter: Record<string, any>; update: Record<string, any> }>,
  batchSize = 100
): Promise<BatchOperationResult> {
  const result: BatchOperationResult = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Process in batches to avoid overwhelming the database
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const bulkOps = batch.map((op) => ({
      updateOne: {
        filter: op.filter,
        update: { $set: op.update },
        upsert: true,
      },
    }));

    try {
      const bulkResult = await model.bulkWrite(bulkOps, { ordered: false });
      result.successful += bulkResult.upsertedCount + bulkResult.modifiedCount;
    } catch (error) {
      result.failed += batch.length;
      result.errors.push({
        index: i,
        error: error as Error,
      });
      logger.error('Batch upsert failed', {
        model: model.modelName,
        batchIndex: i,
        batchSize: batch.length,
        error,
      });
    }
  }

  return result;
}

/**
 * Process items in batches with a processor function
 * 
 * @param items - Array of items to process
 * @param processor - Function to process each batch
 * @param batchSize - Size of each batch (default: 50)
 * @returns Array of results from each batch
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R>,
  batchSize = 50
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const result = await processor(batch);
    results.push(result);
  }

  return results;
}

/**
 * Process items in parallel batches for maximum throughput
 * 
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param concurrency - Number of parallel operations (default: 10)
 * @returns Array of results
 */
export async function processParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency = 10
): Promise<Array<R | Error>> {
  const results: Array<R | Error> = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(processor));
    
    results.push(
      ...batchResults.map((result) =>
        result.status === 'fulfilled' ? result.value : result.reason
      )
    );
  }

  return results;
}
