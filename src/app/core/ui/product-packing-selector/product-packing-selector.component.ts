import { Component, EventEmitter, Input, Output } from '@angular/core';
import { productBarCodes } from '../../interfaces/barcode.interface';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-product-packing-selector',
  imports: [CommonModule],
  templateUrl: './product-packing-selector.component.html',
  styleUrl: './product-packing-selector.component.scss'
})
export class ProductPackingSelectorComponent {

  @Input() productPackingInput: productBarCodes[] | null = null;
  @Input() selectedBarcodeId: string | null = null;
  @Output() selectedBarcode = new EventEmitter<string>();


  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  changeProductId(newId: string): void {
    this.router.navigate(['/product', newId], {
      replaceUrl: false,
      queryParamsHandling: 'preserve',
      preserveFragment: true,
      state: { preserveData: true }
    });
  }

  selectBarcode(idBarcode: string): void {
    this.selectedBarcodeId = idBarcode;
    this.changeProductId(idBarcode);
    this.selectedBarcode.emit(idBarcode);
  }
}


