import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-offer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './offer.component.html',
  styleUrls: ['./offer.component.scss']
})
export class OfferComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  effectiveDate: string = '01.01.2026';
  
  sections = [
    { id: 'general', title: 'Общие положения', open: false },
    { id: 'prices', title: 'Цены и сумма заказа', open: false },
    { id: 'order', title: 'Оформление и оплата заказа', open: false },
    { id: 'processing', title: 'Обработка заказа', open: false },
    { id: 'delivery', title: 'Доставка заказа', open: false },
    { id: 'return', title: 'Возврат товара', open: false },
    { id: 'refund', title: 'Возврат денежных средств', open: false },
    { id: 'personal', title: 'Персональные данные', open: false },
    { id: 'other', title: 'Прочее', open: false }
  ];

  activeSection: string | null = null;
  showScrollTop: boolean = false;

  ngOnInit() {
    window.addEventListener('scroll', this.onScroll.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.onScroll.bind(this));
  }

  toggleSection(sectionId: string) {
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      section.open = !section.open;
    }
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeSection = sectionId;
    }
  }

  onScroll() {
    this.showScrollTop = window.scrollY > 400;
    
    // Определяем активную секцию при скролле
    for (const section of this.sections) {
      const element = document.getElementById(section.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          this.activeSection = section.id;
          break;
        }
      }
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  printOffer() {
    window.print();
  }
}