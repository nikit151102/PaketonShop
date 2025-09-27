import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Address {
  id: string;
  label: string; // читаемое название для списка
  country: string;
  region: string;
  city: string;
  street: string;
  house: string;
  postIndex: string;
}

@Component({
  selector: 'app-partner-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './partner-form.component.html',
  styleUrls: ['./partner-form.component.scss']
})
export class PartnerFormComponent {
  partnerForm: FormGroup;
  isOpen = false;

  existingAddresses: Address[] = [
    {
      id: '1',
      label: 'Москва, Красная площадь 1',
      country: 'Россия',
      region: 'Москва',
      city: 'Москва',
      street: 'Красная площадь',
      house: '1',
      postIndex: '101000'
    },
    {
      id: '2',
      label: 'Санкт-Петербург, Невский проспект 10',
      country: 'Россия',
      region: 'Ленинградская обл.',
      city: 'Санкт-Петербург',
      street: 'Невский проспект',
      house: '10',
      postIndex: '190000'
    }
  ];

  createNewAddress = false;

  constructor(private fb: FormBuilder) {
    this.partnerForm = this.fb.group({
      fullName: ['', Validators.required],
      shortName: ['', Validators.required],
      inn: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      ogrn: ['', Validators.required],
      kpp: ['', Validators.required],
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      korAccount: [''],
      workDirection: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      bankAccount: ['', Validators.required],
      partnerTypeId: ['', Validators.required],
      selectedAddressId: [''],
      address: this.fb.group({
        country: [''],
        region: [''],
        city: [''],
        street: [''],
        house: [''],
        postIndex: ['']
      })
    });
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
    this.partnerForm.reset();
    this.createNewAddress = false;
  }

  onAddressSelect(event: Event) {
    const selectedId = (event.target as HTMLSelectElement).value;
    if (selectedId === 'new') {
      this.createNewAddress = true;
      this.partnerForm.get('address')?.reset();
    } else {
      this.createNewAddress = false;
      const selectedAddress = this.existingAddresses.find(a => a.id === selectedId);
      if (selectedAddress) {
        this.partnerForm.patchValue({
          address: {
            country: selectedAddress.country,
            region: selectedAddress.region,
            city: selectedAddress.city,
            street: selectedAddress.street,
            house: selectedAddress.house,
            postIndex: selectedAddress.postIndex
          }
        });
      }
    }
  }

  submit() {
    if (this.partnerForm.valid) {
      console.log('Form Submitted:', this.partnerForm.value);
      this.close();
    } else {
      this.partnerForm.markAllAsTouched();
    }
  }
}
