import { TestBed } from '@angular/core/testing';

import { DeliveryAddressesService } from './delivery-addresses.service';

describe('DeliveryAddressesService', () => {
  let service: DeliveryAddressesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeliveryAddressesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
