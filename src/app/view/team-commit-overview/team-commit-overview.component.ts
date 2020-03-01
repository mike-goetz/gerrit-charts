import {AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild} from '@angular/core';
import {Chart, ChartDataSets, ChartOptions} from 'chart.js';
import 'chartjs-plugin-colorschemes';
import {Label} from 'ng2-charts';
import {Subscription} from 'rxjs';
import {Team} from '../../model/team';
import {GerritService} from '../../service/gerrit.service';

@Component({
  selector: 'app-team-commit-overview',
  templateUrl: './team-commit-overview.component.html',
  styleUrls: ['./team-commit-overview.component.scss']
})
export class TeamCommitOverviewComponent implements AfterViewInit, OnDestroy {
  @Input() team: Team;
  @ViewChild('teamCommitChart') teamCommitChart: ElementRef;
  labels: Label[] = [];
  datasets: ChartDataSets[] = [];
  options: ChartOptions = {
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
  };
  private subscription: Subscription;

  constructor(private gerritService: GerritService) {
  }

  ngAfterViewInit(): void {
    this.subscription = this.gerritService.filter$.subscribe(() => {
      const map = this.gerritService.getTeamData(this.team);
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
        this.datasets.push(dataSet);
      });
      new Chart(this.teamCommitChart.nativeElement, {
        type: 'line',
        data: {
          datasets: this.datasets
        },
        options: this.options
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
