import {Chart} from "chart.js";
import {MatrixDataSet} from "./matrix-data-set";

export interface MatrixChartContext {
  chart?: Chart;
  dataIndex?: number;
  dataset?: MatrixDataSet
  datasetIndex?: number;
}
