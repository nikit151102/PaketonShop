import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessBlockComponent } from './business-block.component';

describe('BusinessBlockComponent', () => {
  let component: BusinessBlockComponent;
  let fixture: ComponentFixture<BusinessBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
