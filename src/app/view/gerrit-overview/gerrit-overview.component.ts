import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {Subscription} from 'rxjs';
import {GerritService, ListOfContributorsEntry} from '../../service/gerrit.service';

@Component({
  selector: 'app-gerrit-overview',
  templateUrl: './gerrit-overview.component.html',
  styleUrls: ['./gerrit-overview.component.scss']
})
export class GerritOverviewComponent implements OnInit, OnDestroy {

  numberOfContributors: number;
  numberOfCommits: number;
  mostBusyDay: { date: string, count: number };
  displayedColumns: string[] = ['name', 'teamName', 'commits', 'reviews'];
  dataSource = undefined;
  @ViewChild(MatSort, {static: true}) sort: MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  private subscription: Subscription;

  constructor(private gerritService: GerritService) {
  }

  ngOnInit(): void {
    this.subscription = this.gerritService.filter$.subscribe(() => {
      this.dataSource = new MatTableDataSource<ListOfContributorsEntry>(this.gerritService.getListOfContributors());
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      this.numberOfContributors = this.gerritService.getNumberOfContributors();
      this.numberOfCommits = this.gerritService.getNumberOfCommits();
      this.mostBusyDay = this.gerritService.getMostBusyDay();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
