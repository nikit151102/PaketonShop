import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactTypeSelectorComponent } from './contact-type-selector.component';

describe('ContactTypeSelectorComponent', () => {
  let component: ContactTypeSelectorComponent;
  let fixture: ComponentFixture<ContactTypeSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactTypeSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactTypeSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
