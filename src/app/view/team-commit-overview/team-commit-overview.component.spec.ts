import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {TeamCommitOverviewComponent} from './team-commit-overview.component';

describe('TeamCommitOverviewComponent', () => {
  let component: TeamCommitOverviewComponent;
  let fixture: ComponentFixture<TeamCommitOverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TeamCommitOverviewComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamCommitOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
