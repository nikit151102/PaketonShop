import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsletterConsentComponent } from './newsletter-consent.component';

describe('NewsletterConsentComponent', () => {
  let component: NewsletterConsentComponent;
  let fixture: ComponentFixture<NewsletterConsentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsletterConsentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsletterConsentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
