import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface RouteHistory {
  url: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class RouteStateService {
  private routeHistory: RouteHistory[] = [];
  private readonly MAX_HISTORY = 10;
  private isFromCache = false;

  constructor(private router: Router) {
    this.setupRouterListener();
  }

  private setupRouterListener(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.routeHistory.push({
          url: event.url,
          timestamp: Date.now()
        });
        
        // Ограничиваем размер истории
        if (this.routeHistory.length > this.MAX_HISTORY) {
          this.routeHistory.shift();
        }
      });
  }

  isReturningToHome(): boolean {
    if (this.routeHistory.length < 2) return false;
    
    const current = this.routeHistory[this.routeHistory.length - 1];
    const previous = this.routeHistory[this.routeHistory.length - 2];
    
    return current.url === '/' && previous.url !== '/';
  }

  getPreviousRoute(): string | null {
    if (this.routeHistory.length < 2) return null;
    return this.routeHistory[this.routeHistory.length - 2].url;
  }

  setIsFromCache(value: boolean): void {
    this.isFromCache = value;
  }

  getIsFromCache(): boolean {
    return this.isFromCache;
  }

  clearHistory(): void {
    this.routeHistory = [];
  }
}