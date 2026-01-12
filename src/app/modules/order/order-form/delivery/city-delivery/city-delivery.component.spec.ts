import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityDeliveryComponent } from './city-delivery.component';

describe('CityDeliveryComponent', () => {
  let component: CityDeliveryComponent;
  let fixture: ComponentFixture<CityDeliveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CityDeliveryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CityDeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
