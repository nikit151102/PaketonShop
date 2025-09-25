import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { DeliveryAddressesService } from './delivery-addresses.service';
import { Address } from '../../../../../models/address.interface';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-delivery-addresses',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './delivery-addresses.component.html',
  styleUrl: './delivery-addresses.component.scss'
})
export class DeliveryAddressesComponent  implements OnInit {
  addresses: Address[] = [
  {
    id: '1',
    region: 'Московская область',
    area: 'Одинцовский район',
    city: 'Москва',
    street: 'Ленина',
    house: '10',
    housing: '1',
    postIndex: '123456',
    floorNumber: '3',
    office: '15',
    gps: '55.7558, 37.6173',
    latitude: 55.7558,
    longitude: 37.6173,
    system: 'web'
  },
  {
    id: '2',
    region: 'Санкт-Петербург',
    city: 'Санкт-Петербург',
    street: 'Невский проспект',
    house: '24',
    postIndex: '654321',
    office: '12',
    latitude: 59.9343,
    longitude: 30.3351,
    system: 'mobile'
  },
  {
    id: '3',
    region: 'Краснодарский край',
    city: 'Сочи',
    street: 'Курортный проспект',
    house: '5Б',
    postIndex: '987654',
    gps: '43.5855, 39.7204',
    system: 'web'
  }
];

  loading = false;
  error: string | null = null;

  // modal
  isModalOpen = false;
  isDeleteConfirmOpen = false;
  isEditing = false;
  editingAddress: Address | null = null;

  addressForm!: FormGroup;

  // simple client-side search
  filter = '';

  constructor(
    private deliveryAddressesService: DeliveryAddressesService,
    private fb: FormBuilder
  ) {
    this.addressForm = this.fb.group({
      id: [null],
      region: [''],
      area: [''],
      city: ['', Validators.required],
      street: ['', Validators.required],
      house: ['', Validators.required],
      housing: [''],
      floorNumber: [''],
      office: [''],
      postIndex: [''],
      latitude: [null],
      longitude: [null],
      system: ['web']
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.deliveryAddressesService.list()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (list) => (this.addresses = list || []),
        error: (err) => (this.error = 'Не удалось загрузить адреса')
      });
  }

  openAdd() {
    this.isEditing = false;
    this.editingAddress = null;
    this.addressForm.reset({ system: 'web' });
    this.isModalOpen = true;
  }

  openEdit(addr: Address) {
    this.isEditing = true;
    this.editingAddress = addr;
    this.addressForm.patchValue(addr);
    this.isModalOpen = true;
  }

  save() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    const payload: Address = this.addressForm.value;
    this.loading = true;
    this.error = null;

    if (this.isEditing && payload.id) {
      this.deliveryAddressesService.update(payload.id, payload)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: () => {
            this.isModalOpen = false;
            this.load();
          },
          error: () => { this.error = 'Ошибка при сохранении адреса'; }
        });
    } else {
      // create
      this.deliveryAddressesService.create(payload)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: () => {
            this.isModalOpen = false;
            this.load();
          },
          error: () => { this.error = 'Ошибка при создании адреса'; }
        });
    }
  }

  confirmDelete(addr: Address) {
    this.editingAddress = addr;
    this.isDeleteConfirmOpen = true;
  }

  delete() {
    if (!this.editingAddress?.id) return;
    this.loading = true;
    this.error = null;
    const id = this.editingAddress.id;
    this.deliveryAddressesService.delete(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.isDeleteConfirmOpen = false;
          this.load();
        },
        error: () => { this.error = 'Ошибка при удалении адреса'; }
      });
  }

  cancelModal() {
    this.isModalOpen = false;
  }

  // UI helpers
  filteredAddresses(): Address[] {
    const q = this.filter.trim().toLowerCase();
    if (!q) return this.addresses;
    return this.addresses.filter(a =>
      `${a.city ?? ''} ${a.street ?? ''} ${a.house ?? ''} ${a.office ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  }
}