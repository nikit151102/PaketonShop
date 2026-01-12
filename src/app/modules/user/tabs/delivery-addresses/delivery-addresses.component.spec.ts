import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryAddressesComponent } from './delivery-addresses.component';

describe('DeliveryAddressesComponent', () => {
  let component: DeliveryAddressesComponent;
  let fixture: ComponentFixture<DeliveryAddressesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryAddressesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryAddressesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
