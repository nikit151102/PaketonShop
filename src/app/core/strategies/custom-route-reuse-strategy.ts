import { Injectable } from '@angular/core';
import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';


@Injectable()
export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  private storedHandles = new Map<string, DetachedRouteHandle>();

  private getRouteKey(route: ActivatedRouteSnapshot): string {
    const path = route.routeConfig?.path || '';
    return path;
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // Кэшируем только главную страницу
    return route.routeConfig?.path === '';
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (handle && this.shouldDetach(route)) {
      const key = this.getRouteKey(route);
      this.storedHandles.set(key, handle);
      console.log('RouteReuseStrategy: stored handle for home');
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = this.getRouteKey(route);
    return route.routeConfig?.path === '' && this.storedHandles.has(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.getRouteKey(route);
    const handle = this.storedHandles.get(key) || null;
    
    if (handle) {
      console.log('RouteReuseStrategy: retrieved handle for home');
    }
    
    return handle;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  clearCache(): void {
    this.storedHandles.clear();
    console.log('RouteReuseStrategy: cache cleared');
  }
}