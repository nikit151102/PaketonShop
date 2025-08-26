import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnerCardsComponent } from './partner-cards.component';

describe('PartnerCardsComponent', () => {
  let component: PartnerCardsComponent;
  let fixture: ComponentFixture<PartnerCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerCardsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnerCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
