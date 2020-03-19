import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserContributionOverviewComponent } from './user-contribution-overview.component';

describe('UserContributionOverviewComponent', () => {
  let component: UserContributionOverviewComponent;
  let fixture: ComponentFixture<UserContributionOverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserContributionOverviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserContributionOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
