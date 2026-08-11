import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelfEmployedRegistrationComponent } from './self-employed-registration.component';

describe('SelfEmployedRegistrationComponent', () => {
  let component: SelfEmployedRegistrationComponent;
  let fixture: ComponentFixture<SelfEmployedRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelfEmployedRegistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelfEmployedRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
