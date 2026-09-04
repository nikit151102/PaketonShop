import { TestBed } from '@angular/core/testing';

import { PromoOrderService } from './promo-order.service';

describe('PromoOrderService', () => {
  let service: PromoOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PromoOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
