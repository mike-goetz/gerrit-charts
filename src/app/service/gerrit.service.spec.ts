import {TestBed} from '@angular/core/testing';

import {GerritService} from './gerrit.service';

describe('GerritService', () => {
  let service: GerritService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GerritService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
