import {ChartDataSets} from "chart.js";
import {ContributionChartDataPoint} from "./contribution-chart-data-point";

export interface MatrixDataSet extends ChartDataSets {
  data: ContributionChartDataPoint[]
}
