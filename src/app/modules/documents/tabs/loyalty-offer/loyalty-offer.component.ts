import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-loyalty-offer',
  imports: [CommonModule, RouterModule],
  templateUrl: './loyalty-offer.component.html',
  styleUrl: './loyalty-offer.component.scss'
})
export class LoyaltyOfferComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  effectiveDate: string = '01.01.2026';

  sections = [
    { id: 'general', title: 'Общие положения', open: false },
    { id: 'terms', title: 'Термины и определения', open: false },
    { id: 'subject', title: 'Предмет договора', open: false },
    { id: 'reward', title: 'Размер и порядок выплаты вознаграждения', open: false },
    { id: 'rights', title: 'Права и обязанности Сторон', open: false },
    { id: 'liability', title: 'Ответственность Сторон', open: false },
    { id: 'term', title: 'Срок действия и расторжение', open: false },
    { id: 'other', title: 'Прочие условия', open: false },
    { id: 'requisites', title: 'Реквизиты Компании', open: false },
    { id: 'appendix', title: 'Приложение №1: Форма Отчёта Агента', open: false }
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