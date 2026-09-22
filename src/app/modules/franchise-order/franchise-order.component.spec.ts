import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FranchiseOrderComponent } from './franchise-order.component';

describe('FranchiseOrderComponent', () => {
  let component: FranchiseOrderComponent;
  let fixture: ComponentFixture<FranchiseOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FranchiseOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FranchiseOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
