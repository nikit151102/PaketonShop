import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoyaltySystemComponent } from './loyalty-system.component';

describe('LoyaltySystemComponent', () => {
  let component: LoyaltySystemComponent;
  let fixture: ComponentFixture<LoyaltySystemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoyaltySystemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoyaltySystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
