import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {UserContributionChartComponent} from './user-contribution-chart.component';

describe('UserContributionChartComponent', () => {
  let component: UserContributionChartComponent;
  let fixture: ComponentFixture<UserContributionChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [UserContributionChartComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserContributionChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
