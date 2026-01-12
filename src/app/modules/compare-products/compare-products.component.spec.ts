import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompareProductsComponent } from './compare-products.component';

describe('CompareProductsComponent', () => {
  let component: CompareProductsComponent;
  let fixture: ComponentFixture<CompareProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompareProductsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CompareProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
