/**
 * Database Models Index
 * Exports all model classes for easy importing
 */

export { CampaignModel } from './campaign';
export { AdSetModel } from './adset';
export { AdModel } from './ad';
export { PerformanceMetricModel } from './performance-metric';
export { OptimizationRuleModel } from './optimization-rule';
export { OptimizationLogModel } from './optimization-log';

export default {
  Campaign: require('./campaign').CampaignModel,
  AdSet: require('./adset').AdSetModel,
  Ad: require('./ad').AdModel,
  PerformanceMetric: require('./performance-metric').PerformanceMetricModel,
  OptimizationRule: require('./optimization-rule').OptimizationRuleModel,
  OptimizationLog: require('./optimization-log').OptimizationLogModel,
};
