import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YandexIdButtonComponent } from './yandex-id-button.component';

describe('YandexIdButtonComponent', () => {
  let component: YandexIdButtonComponent;
  let fixture: ComponentFixture<YandexIdButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YandexIdButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YandexIdButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
