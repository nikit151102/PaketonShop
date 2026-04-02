import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VkIdButtonComponent } from './vk-id-button.component';

describe('VkIdButtonComponent', () => {
  let component: VkIdButtonComponent;
  let fixture: ComponentFixture<VkIdButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VkIdButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VkIdButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
