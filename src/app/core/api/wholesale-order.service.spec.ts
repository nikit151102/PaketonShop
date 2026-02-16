import { TestBed } from '@angular/core/testing';

import { WholesaleOrderService } from './wholesale-order.service';

describe('WholesaleOrderService', () => {
  let service: WholesaleOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WholesaleOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
