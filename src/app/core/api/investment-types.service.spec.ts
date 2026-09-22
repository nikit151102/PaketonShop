import { TestBed } from '@angular/core/testing';

import { InvestmentTypesService } from './investment-types.service';

describe('InvestmentTypesService', () => {
  let service: InvestmentTypesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InvestmentTypesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
