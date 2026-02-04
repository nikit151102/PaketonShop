import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessAccountRegistrationComponent } from './business-account-registration.component';

describe('BusinessAccountRegistrationComponent', () => {
  let component: BusinessAccountRegistrationComponent;
  let fixture: ComponentFixture<BusinessAccountRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessAccountRegistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessAccountRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
