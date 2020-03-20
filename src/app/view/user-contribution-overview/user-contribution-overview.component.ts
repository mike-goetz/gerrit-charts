import {AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild} from '@angular/core';
import {Chart, ChartDataSets} from 'chart.js';
import {Subject, Subscription} from 'rxjs';
import {GerritService} from '../../service/gerrit.service';
import {Person} from '../../model/person';

@Component({
  selector: 'app-user-contribution-overview',
  templateUrl: './user-contribution-overview.component.html',
  styleUrls: ['./user-contribution-overview.component.scss']
})
export class UserContributionOverviewComponent implements AfterViewInit, OnDestroy {
  @Input() persons: Subject<Person[]> = new Subject<Person[]>();
  @ViewChild('userCommitChart') userCommitChart: ElementRef;
  selectedPersons: Person[];
  private chart: Chart;
  private subscriptions: Subscription[] = [];

  constructor(private gerritService: GerritService) {
  }

  ngAfterViewInit(): void {
    this.subscriptions.push(this.persons.subscribe(value => {
      this.selectedPersons = [...value];
      this.buildChart(value);
    }));
    this.subscriptions.push(this.gerritService.filter$.subscribe(() => {
      this.selectedPersons = [];
      this.buildChart();
    }));
  }

  private buildChart(value: Person[] = []) {
    const datasets: ChartDataSets[] = [];
    const map = this.gerritService.getPersonsData(value);
    map.forEach((personData, person) => {
      const data = [];
      personData.forEach((y, x) => {
        data.push({
          x,
          y
        });
      });
      const dataSet: ChartDataSets = {
        label: person.name,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 6,
        data,
      };
      datasets.push(dataSet);
    });
    if (this.chart) {
      this.chart.destroy();
    }
    this.chart = new Chart(this.userCommitChart.nativeElement, {
      type: 'line',
      data: {
        datasets
      },
      options: {
        tooltips: {
          mode: 'index',
          intersect: false
        },
        scales: {
          xAxes: [{
            type: 'time',
            time: {
              unit: 'month',
              round: 'day',
              displayFormats: {
                month: 'MMM'
              }
            },
            ticks: {
              maxRotation: 0,
              autoSkip: true
            },
            scaleLabel: {
              display: true,
              labelString: 'Date'
            }
          }],
          yAxes: [{
            position: 'right',
            scaleLabel: {
              display: true,
              labelString: 'Commits'
            },
            ticks: {
              min: 0,
            }
          }]
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
