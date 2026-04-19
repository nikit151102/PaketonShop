import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopupModalComponent } from './topup-modal.component';

describe('TopupModalComponent', () => {
  let component: TopupModalComponent;
  let fixture: ComponentFixture<TopupModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopupModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
