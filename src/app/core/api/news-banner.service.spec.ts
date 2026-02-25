import { TestBed } from '@angular/core/testing';

import { NewsBannerService } from './news-banner.service';

describe('NewsBannerService', () => {
  let service: NewsBannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewsBannerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
