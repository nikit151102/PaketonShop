import { TestBed } from '@angular/core/testing';

import { ProductFavoriteService } from './product-favorite.service';

describe('ProductFavoriteService', () => {
  let service: ProductFavoriteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductFavoriteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
