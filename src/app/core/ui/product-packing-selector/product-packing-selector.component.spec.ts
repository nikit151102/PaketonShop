import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductPackingSelectorComponent } from './product-packing-selector.component';

describe('ProductPackingSelectorComponent', () => {
  let component: ProductPackingSelectorComponent;
  let fixture: ComponentFixture<ProductPackingSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductPackingSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductPackingSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
