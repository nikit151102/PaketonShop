import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingContactButtonsComponent } from './floating-contact-buttons.component';

describe('FloatingContactButtonsComponent', () => {
  let component: FloatingContactButtonsComponent;
  let fixture: ComponentFixture<FloatingContactButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingContactButtonsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloatingContactButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
