import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompareCommonBtnComponent } from './compare-common-btn.component';

describe('CompareCommonBtnComponent', () => {
  let component: CompareCommonBtnComponent;
  let fixture: ComponentFixture<CompareCommonBtnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompareCommonBtnComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompareCommonBtnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
