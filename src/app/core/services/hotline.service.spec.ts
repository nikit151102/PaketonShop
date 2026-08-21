import { TestBed } from '@angular/core/testing';

import { HotlineService } from './hotline.service';

describe('HotlineService', () => {
  let service: HotlineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HotlineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
