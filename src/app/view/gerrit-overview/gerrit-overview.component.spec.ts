import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {GerritOverviewComponent} from './gerrit-overview.component';

describe('GerritOverviewComponent', () => {
  let component: GerritOverviewComponent;
  let fixture: ComponentFixture<GerritOverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GerritOverviewComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GerritOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
