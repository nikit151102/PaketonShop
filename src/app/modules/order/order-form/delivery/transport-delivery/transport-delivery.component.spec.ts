import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransportDeliveryComponent } from './transport-delivery.component';

describe('TransportDeliveryComponent', () => {
  let component: TransportDeliveryComponent;
  let fixture: ComponentFixture<TransportDeliveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransportDeliveryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransportDeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
