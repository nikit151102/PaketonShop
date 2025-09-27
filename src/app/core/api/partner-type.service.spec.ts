import { TestBed } from '@angular/core/testing';

import { PartnerTypeService } from './partner-type.service';

describe('PartnerTypeService', () => {
  let service: PartnerTypeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PartnerTypeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
