import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasketManagerModalComponent } from './basket-manager-modal.component';

describe('BasketManagerModalComponent', () => {
  let component: BasketManagerModalComponent;
  let fixture: ComponentFixture<BasketManagerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasketManagerModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BasketManagerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
