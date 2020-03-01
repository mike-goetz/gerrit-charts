import {ChartPoint} from 'chart.js';

export interface ContributionChartDataPoint extends ChartPoint {
  date: string;
  commits: number;
  reviews: number;
}
