import { TestBed } from '@angular/core/testing';

import { ComparingService } from './comparing.service';

describe('ComparingService', () => {
  let service: ComparingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComparingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
