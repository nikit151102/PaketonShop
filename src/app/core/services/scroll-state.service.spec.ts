import { TestBed } from '@angular/core/testing';

import { ScrollStateService } from './scroll-state.service';

describe('ScrollStateService', () => {
  let service: ScrollStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScrollStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
