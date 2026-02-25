import { TestBed } from '@angular/core/testing';

import { NicheProductsService } from './niche-products.service';

describe('NicheProductsService', () => {
  let service: NicheProductsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NicheProductsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
