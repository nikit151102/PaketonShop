import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnershipAgreementComponent } from './partnership-agreement.component';

describe('PartnershipAgreementComponent', () => {
  let component: PartnershipAgreementComponent;
  let fixture: ComponentFixture<PartnershipAgreementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnershipAgreementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnershipAgreementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
