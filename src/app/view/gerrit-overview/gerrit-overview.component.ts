import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {Subject, Subscription} from 'rxjs';
import {GerritService, ListOfContributorsEntry} from '../../service/gerrit.service';
import {SelectionModel} from '@angular/cdk/collections';
import {Person} from '../../model/person';

@Component({
  selector: 'app-gerrit-overview',
  templateUrl: './gerrit-overview.component.html',
  styleUrls: ['./gerrit-overview.component.scss']
})
export class GerritOverviewComponent implements OnInit, OnDestroy {

  numberOfContributors: number;
  numberOfCommits: number;
  mostBusyDay: { date: string, count: number };
  displayedColumns: string[] = ['select', 'name', 'teamName', 'commits', 'reviews'];
  dataSource = undefined;
  @ViewChild(MatSort, {static: true}) sort: MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  selection = new SelectionModel<ListOfContributorsEntry>(true, []);
  private subscriptions: Subscription[] = [];
  persons: Subject<Person[]> = new Subject<Person[]>();

  constructor(private gerritService: GerritService) {
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows;
  }

  isRowSelected(row: ListOfContributorsEntry): boolean {
    return this.selection.isSelected(row);
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      const rows: ListOfContributorsEntry[] = [];
      this.dataSource.filteredData.forEach(row => rows.push(row));
      this.selection.select(...rows);
    }
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: ListOfContributorsEntry): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} ${row.person.name}`;
  }

  ngOnInit(): void {
    this.subscriptions.push(this.selection.changed.asObservable().subscribe(value => {
      this.persons.next(this.selection.selected.map(value1 => value1.person));
    }));
    this.subscriptions.push(this.gerritService.filter$.subscribe(() => {
      this.dataSource = new MatTableDataSource<ListOfContributorsEntry>(this.gerritService.getListOfContributors());
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      this.numberOfContributors = this.gerritService.getNumberOfContributors();
      this.numberOfCommits = this.gerritService.getNumberOfCommits();
      this.mostBusyDay = this.gerritService.getMostBusyDay();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
