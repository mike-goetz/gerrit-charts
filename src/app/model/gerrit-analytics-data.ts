import {ContributionChartDataPoint} from './contribution-chart-data-point';
import {Person} from './person';

export interface GerritAnalyticsData {
  person: Person;
  numberOfCommits: number;
  numberOfReviews: number;
  numberOfContributions: number;
  averageNumberOfCommitsPerTeamMember: number;
  averageNumberOfReviewsPerTeamMember: number;
  contributionData: ContributionChartDataPoint[];
}
