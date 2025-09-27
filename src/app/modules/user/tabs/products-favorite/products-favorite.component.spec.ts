import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsFavoriteComponent } from './products-favorite.component';

describe('ProductsFavoriteComponent', () => {
  let component: ProductsFavoriteComponent;
  let fixture: ComponentFixture<ProductsFavoriteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsFavoriteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductsFavoriteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
