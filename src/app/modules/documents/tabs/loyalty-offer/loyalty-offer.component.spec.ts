import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoyaltyOfferComponent } from './loyalty-offer.component';

describe('LoyaltyOfferComponent', () => {
  let component: LoyaltyOfferComponent;
  let fixture: ComponentFixture<LoyaltyOfferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoyaltyOfferComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoyaltyOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
