import { TestBed } from '@angular/core/testing';

import { BasketsStateService } from './baskets-state.service';

describe('BasketsStateService', () => {
  let service: BasketsStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BasketsStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
