import { TestBed } from '@angular/core/testing';

import { ProductPlaceService } from './product-place.service';

describe('ProductPlaceService', () => {
  let service: ProductPlaceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductPlaceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
