import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceDeliveryComponent } from './invoice-delivery.component';

describe('InvoiceDeliveryComponent', () => {
  let component: InvoiceDeliveryComponent;
  let fixture: ComponentFixture<InvoiceDeliveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceDeliveryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceDeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
