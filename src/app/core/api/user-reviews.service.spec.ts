import { TestBed } from '@angular/core/testing';

import { userReviewsService } from './user-reviews.service';

describe('userReviewsService', () => {
  let service: userReviewsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(userReviewsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
