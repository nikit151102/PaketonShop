import { TestBed } from '@angular/core/testing';

import { PartnerBankService } from './partner-bank.service';

describe('PartnerBankService', () => {
  let service: PartnerBankService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PartnerBankService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
