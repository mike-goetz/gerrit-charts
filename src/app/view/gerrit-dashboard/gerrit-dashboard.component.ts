import {SelectionModel} from '@angular/cdk/collections';
import {Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {Subscription} from 'rxjs';
import {Team} from '../../model/team';
import {GerritService, ListOfProjectsEntry} from '../../service/gerrit.service';
import {MasterDataService} from '../../service/master-data.service';
import {FormControl, Validators} from '@angular/forms';

@Component({
  selector: 'app-gerrit-dashboard',
  templateUrl: './gerrit-dashboard.component.html',
  styleUrls: ['./gerrit-dashboard.component.scss']
})
export class GerritDashboardComponent implements OnInit, OnDestroy {
  numberOfDays = new FormControl({value: 365, disabled: false}, [
    Validators.required,
    Validators.pattern('[1-9][0-9]*')
  ]);

  teams: Team[] = undefined;
  displayedColumns: string[] = ['select', 'project', 'commits', 'contributors'];
  dataSource = undefined;
  @ViewChild(MatSort, {static: true}) sort: MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  selection = new SelectionModel<ListOfProjectsEntry>(true, []);
  @Output() updateFilter = new EventEmitter<string[]>();
  private subscriptions: Subscription[] = [];

  previousNumberOfDays: number;
  scopeChangeOngoing: boolean;

  constructor(private gerritService: GerritService, private masterDataService: MasterDataService) {
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows;
  }

  isRowSelected(row: ListOfProjectsEntry): boolean {
    return this.selection.isSelected(row);
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      const rows: ListOfProjectsEntry[] = [];
      this.dataSource.filteredData.forEach(row => rows.push(row));
      this.selection.select(...rows);
    }
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: ListOfProjectsEntry): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} project ${row.project}`;
  }

  updateNumberOfDaysFilter() {
    console.log('updateNumberOfDaysFilter', this.numberOfDays.value);
    if (this.numberOfDays.valid) {
      this.gerritService.updateDaysFilter(this.numberOfDays.value);
    }
  }

  ngOnInit(): void {
    this.previousNumberOfDays = this.numberOfDays.value;
    this.dataSource = new MatTableDataSource<ListOfProjectsEntry>();
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.subscriptions.push(this.selection.changed.asObservable().subscribe(value => {
      if (!this.scopeChangeOngoing) {
        const projects = this.selection.selected.map(i => i.project);
        this.gerritService.updateProjectsFilter(projects);
      }
    }));
    this.subscriptions.push(this.gerritService.filter$.subscribe(value => {
      this.teams = this.masterDataService.getTeams(this.gerritService.getContributors());
      if (this.previousNumberOfDays !== value.numberOfDays) {
        this.scopeChangeOngoing = true;
        this.previousNumberOfDays = value.numberOfDays;
        this.dataSource.data = this.gerritService.getProjects();
        const projects = this.selection.selected.map(i => i.project);
        this.selection.clear();
        this.dataSource.data.forEach(entry => {
          if (projects.indexOf(entry.project) > -1) {
            this.selection.select(entry);
          }
        });
        this.scopeChangeOngoing = false;
      }
    }));

    this.gerritService.updateDaysFilter(this.numberOfDays.value);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
