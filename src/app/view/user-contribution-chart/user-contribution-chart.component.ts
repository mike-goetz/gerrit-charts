import {AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild} from '@angular/core';
import {Chart} from 'chart.js';
import 'chartjs-chart-matrix';
import {Subscription} from 'rxjs';
import {GerritAnalyticsData} from '../../model/gerrit-analytics-data';
import {MatrixChartContext} from '../../model/matrix-chart-context';
import {MatrixChartData} from '../../model/matrix-chart-data';
import {Person} from '../../model/person';
import {Team} from '../../model/team';
import {GerritService} from '../../service/gerrit.service';

@Component({
  selector: 'app-user-contribution-chart',
  templateUrl: './user-contribution-chart.component.html',
  styleUrls: ['./user-contribution-chart.component.scss']
})
export class UserContributionChartComponent implements AfterViewInit, OnDestroy {
  @Input() team: Team;
  @Input() person: Person;
  @ViewChild('matrixChart') matrixChart: ElementRef;
  @ViewChild('distributionChart') distributionChart: ElementRef;
  @ViewChild('commitsParticipationChart') commitsParticipationChart: ElementRef;
  @ViewChild('reviewsParticipationChart') reviewsParticipationChart: ElementRef;
  private subscription: Subscription;

  constructor(private gerritService: GerritService) {
  }

  ngAfterViewInit(): void {
    this.subscription = this.gerritService.filter$.subscribe((filter) => {
      const analyticsData: GerritAnalyticsData = this.gerritService.getPersonData(this.person, this.team);

      let dataSet = {
        label: 'Contribution Data',
        data: analyticsData.contributionData,
        backgroundColor(ctx: MatrixChartContext) {
          const dataPoint = ctx.dataset.data[ctx.dataIndex];
          if (dataPoint === undefined) {
            return 'rgba(255,255,255)';
          } else {
            const value = dataPoint.commits + dataPoint.reviews;
            const alpha = value >= 5 ? 1.0 : value / 5;
            return `rgba(0,146,0,${alpha})`;
          }
        },
        borderColor(ctx: MatrixChartContext) {
          const dataPoint = ctx.dataset.data[ctx.dataIndex];
          if (dataPoint === undefined) {
            return 'rgb(222,222,222)';
          } else {
            const value = dataPoint.commits + dataPoint.reviews;
            const alpha = (10 + value) / 60;
            return `rgba(0,106,0,${alpha})`;
          }
        },
        borderWidth: 1,
        hoverBorderColor: 'yellow',
        height(ctx: MatrixChartContext) {
          const a = ctx.chart.chartArea;
          return (a.bottom - a.top) / 7 - 3;
        },
        width(ctx: MatrixChartContext) {
          const a = ctx.chart.chartArea;
          return (a.right - a.left) / (filter.numberOfDays / 365 * 60);
        }
      };
      new Chart(this.matrixChart.nativeElement, {
        type: 'matrix',
        data: {
          datasets: [dataSet]
        },
        options: {
          responsive: false,
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: [
              `${analyticsData.numberOfContributions} contributions from ${analyticsData.person.name} in the last year`,
              `${analyticsData.numberOfCommits} submitted changes and ${analyticsData.numberOfReviews} code reviews`
            ]
          },
          tooltips: {
            displayColors: false,
            callbacks: {
              title() {
                return '';
              },
              label(item, data: MatrixChartData) {
                const dataPoint = data.datasets[item.datasetIndex].data[item.index];
                return ['Date: ' + dataPoint.date, 'Submitted changes: ' + dataPoint.commits, 'Code reviews: ' + dataPoint.reviews];
              }
            }
          },
          scales: {
            xAxes: [{
              type: 'time',
              position: 'top',
              offset: true,
              time: {
                unit: 'month',
                round: 'week',
                displayFormats: {
                  week: 'MMM',
                  month: 'MMM'
                }
              },
              ticks: {
                maxRotation: 0,
                autoSkip: true
              },
              gridLines: {
                display: false,
                drawBorder: false,
                tickMarkLength: 0,
              }
            }],
            yAxes: [{
              type: 'time',
              offset: true,
              position: 'left',
              time: {
                unit: 'day',
                parser: 'e',
                displayFormats: {
                  day: 'ddd'
                }
              },
              ticks: {
                // workaround, see: https://github.com/chartjs/Chart.js/pull/6257
                maxRotation: 90,
                reverse: true
              },
              gridLines: {
                display: false,
                drawBorder: false,
                tickMarkLength: 0
              }
            }]
          }
        }
      });
      new Chart(this.distributionChart.nativeElement, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [
              analyticsData.numberOfCommits,
              analyticsData.numberOfReviews,
            ],
            backgroundColor: [
              'rgb(52,209,255)',
              'rgb(130,228,157)'
            ],
            label: 'Dataset 1'
          }],
          labels: [
            'Submitted changes',
            'Code reviews',
          ]
        },
        options: {
          responsive: false,
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: ['Distribution', 'Code Reviews vs. Changes']
          },
          animation: {
            animateScale: true,
            animateRotate: true
          }
        }
      });
      new Chart(this.commitsParticipationChart.nativeElement, {
        type: 'bar',
        data: {
          labels: [
            'Commits',
          ],
          datasets: [{
            label: 'Average',
            barThickness: 20,
            data: [
              analyticsData.averageNumberOfCommitsPerTeamMember
            ],
            backgroundColor: 'rgb(52,209,255,0.5)',
          }, {
            label: 'Reached',
            barThickness: 20,
            data: [
              analyticsData.numberOfCommits,
            ],
            backgroundColor: 'rgb(52,209,255)',
          }]
        },
        options: {
          responsive: false,
          legend: {
            display: false
          },
          title: {
            display: true,
            text: ['Commits', 'Average vs. Reached']
          },
          tooltips: {
            mode: 'index',
            intersect: false
          },
          scales: {
            yAxes: [{
              stacked: false,
              ticks: {
                min: 0
              }
            }]
          }
        }
      });
      new Chart(this.reviewsParticipationChart.nativeElement, {
        type: 'bar',
        data: {
          labels: [
            'Reviews',
          ],
          datasets: [{
            label: 'Average',
            barThickness: 20,
            data: [
              analyticsData.averageNumberOfReviewsPerTeamMember
            ],
            backgroundColor: 'rgb(130,228,157,0.5)',
          }, {
            label: 'Reached',
            barThickness: 20,
            data: [
              analyticsData.numberOfReviews,
            ],
            backgroundColor: 'rgb(130,228,157)',
          }]
        },
        options: {
          responsive: false,
          legend: {
            display: false
          },
          title: {
            display: true,
            text: ['Reviews', 'Average vs. Reached']
          },
          tooltips: {
            mode: 'index',
            intersect: false
          },
          scales: {
            yAxes: [{
              stacked: false,
              ticks: {
                min: 0
              }
            }]
          }
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
