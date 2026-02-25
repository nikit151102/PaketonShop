import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent implements OnInit {
  currentDate: Date = new Date();
  
  documents = [
    {
      id: 'offer',
      title: 'Публичная оферта',
      type: 'offer',
      icon: 'document',
      description: 'Условия продажи товаров в интернет-магазине',
      lastUpdated: '01.01.2026',
      version: 'редакция от 01.01.2026',
      route: '/documents/offer',
      category: 'legal'
    },
    {
      id: 'partnership',
      title: 'Соглашение о сотрудничестве',
      type: 'partnership',
      icon: 'handshake',
      description: 'Правила для зарегистрированных партнеров',
      lastUpdated: '01.01.2026',
      version: 'текущая редакция',
      route: '/documents/partnership',
      category: 'legal'
    },
    {
      id: 'consent',
      title: 'Согласие на получение рассылки',
      type: 'consent',
      icon: 'mail',
      description: 'Рекламно-информационные материалы',
      lastUpdated: '01.01.2026',
      version: 'бессрочное',
      route: '/documents/consent',
      category: 'personal'
    }
  ];

  selectedCategory: string = 'all';
  searchQuery: string = '';

  categories = [
    { id: 'all', name: 'Все документы', icon: 'all' },
    { id: 'legal', name: 'Правовые', icon: 'legal' },
    { id: 'personal', name: 'Персональные данные', icon: 'personal' }
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  filterByCategory(categoryId: string) {
    this.selectedCategory = categoryId;
  }

  get filteredDocuments() {
    let filtered = this.documents;
    
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === this.selectedCategory);
    }
    
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) || 
        doc.description.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }

  navigateToDocument(route: string) {
    this.router.navigate([route]);
  }

  getCategoryIconClass(categoryId: string): string {
    return `category-${categoryId}`;
  }
}