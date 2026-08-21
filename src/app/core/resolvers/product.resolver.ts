import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProductsService } from '../services/products.service';

export interface ProductRouteData {
  data: any;
  breadCrumbs: any[];
}

export const productResolver: ResolveFn<ProductRouteData | null> = async (route) => {
  const id = route.paramMap.get('id');
  if (!id) return null;

  const productsService = inject(ProductsService);
  try {
    const result: any = await firstValueFrom(productsService.getById(id));
    return {
      data: result.data,
      breadCrumbs: result.breadCrumbs
    };
  } catch (error) {
    console.error('Product resolver error:', error);
    return null;
  }
};