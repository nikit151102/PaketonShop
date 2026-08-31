import { TestBed } from '@angular/core/testing';

import { PromoOrderGroupService } from './promo-order-group.service';

describe('PromoOrderGroupService', () => {
  let service: PromoOrderGroupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PromoOrderGroupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
