import {ChartData} from "chart.js";
import {MatrixDataSet} from "./matrix-data-set";

export interface MatrixChartData extends ChartData {
  datasets?: MatrixDataSet[];
}
