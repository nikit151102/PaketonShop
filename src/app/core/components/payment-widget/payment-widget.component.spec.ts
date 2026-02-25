import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentWidgetComponent } from './payment-widget.component';

describe('PaymentWidgetComponent', () => {
  let component: PaymentWidgetComponent;
  let fixture: ComponentFixture<PaymentWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
