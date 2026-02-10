import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

export interface HomePageState {
  scrollPosition: number;
  products: any[];
  currentPage: number;
  totalItems: number;
  selectedCategory: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScrollStateService implements OnDestroy {
  private readonly STATE_KEY = 'home_page_state';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут
  private routerSubscription!: Subscription;
  private isRestoring = false;

  constructor(
    private router: Router
  ) {
    this.setupRouterListener();
  }

  private setupRouterListener(): void {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        console.log('Route changed to:', event.url);
        
        if (event.url === '/') {
          // Пришли на главную
          this.isRestoring = true;
          console.log('ScrollStateService: Returning to home, will restore state');
        } else if (event.urlAfterRedirects !== '/') {
          // Ушли с главной (но не через редирект)
          this.isRestoring = false;
        }
      });
  }

  saveHomeState(state: HomePageState): void {
    if (this.isRestoring) {
      console.log('ScrollStateService: Skipping save while restoring');
      return;
    }
    
    const enhancedState = {
      ...state,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(this.STATE_KEY, JSON.stringify(enhancedState));
      console.log('ScrollStateService: saved state with scroll position', state.scrollPosition);
    } catch (e) {
      console.warn('Could not save state to localStorage', e);
    }
  }

  loadHomeState(): HomePageState | null {
    if (!this.isRestoring) return null;
    
    try {
      const saved = localStorage.getItem(this.STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        
        // Проверяем TTL
        if (Date.now() - state.timestamp > this.CACHE_TTL) {
          console.log('ScrollStateService: State expired, clearing');
          this.clearHomeState();
          return null;
        }
        
        console.log('ScrollStateService: loaded state with scroll position', state.scrollPosition);
        return state;
      }
    } catch (e) {
      console.warn('Could not load state from localStorage', e);
    }
    return null;
  }

  clearHomeState(): void {
    try {
      localStorage.removeItem(this.STATE_KEY);
      console.log('ScrollStateService: cleared state');
    } catch (e) {
      console.warn('Could not clear state from localStorage', e);
    }
  }

  getIsRestoring(): boolean {
    return this.isRestoring;
  }

  setIsRestoring(value: boolean): void {
    this.isRestoring = value;
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}