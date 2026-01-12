import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NicheCatalogComponent } from './niche-catalog.component';

describe('NicheCatalogComponent', () => {
  let component: NicheCatalogComponent;
  let fixture: ComponentFixture<NicheCatalogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NicheCatalogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NicheCatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
