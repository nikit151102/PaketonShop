import { TestBed } from '@angular/core/testing';

import { OfficeTypesService } from './office-types.service';

describe('OfficeTypesService', () => {
  let service: OfficeTypesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OfficeTypesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
