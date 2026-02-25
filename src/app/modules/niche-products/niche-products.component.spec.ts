import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NicheProductsComponent } from './niche-products.component';

describe('NicheProductsComponent', () => {
  let component: NicheProductsComponent;
  let fixture: ComponentFixture<NicheProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NicheProductsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NicheProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
