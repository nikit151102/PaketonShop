import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfferComponent } from './offer.component';

describe('OfferComponent', () => {
  let component: OfferComponent;
  let fixture: ComponentFixture<OfferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfferComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(OfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle section', () => {
    component.toggleSection('general');
    expect(component.sections[0].open).toBeTrue();
    
    component.toggleSection('general');
    expect(component.sections[0].open).toBeFalse();
  });

  it('should scroll to section', () => {
    spyOn(window, 'scrollTo');
    component.scrollToSection('general');
    expect(component.activeSection).toBe('general');
  });

  it('should show scroll top button after scrolling', () => {
    expect(component.showScrollTop).toBeFalse();
    
    window.scrollY = 500;
    component.onScroll();
    expect(component.showScrollTop).toBeTrue();
  });
});