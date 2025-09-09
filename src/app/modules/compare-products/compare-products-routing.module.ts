import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CompareProductsComponent } from './compare-products.component';

const routes: Routes = [
  {
    path: '', component: CompareProductsComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CompareProductsRoutingModule { }
