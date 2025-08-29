import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectCartButtonComponent } from './select-cart-button.component';

describe('SelectCartButtonComponent', () => {
  let component: SelectCartButtonComponent;
  let fixture: ComponentFixture<SelectCartButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectCartButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectCartButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
