import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Address } from '../../../../../models/address.interface';
import { environment } from '../../../../../environment';

@Injectable({
  providedIn: 'root'
})
export class DeliveryAddressesService {
  private base = `${environment.production}/api/Entities/Address`;

  constructor(private http: HttpClient) {}

  list(): Observable<Address[]> {
    return this.http.get<Address[]>(this.base);
  }

  create(address: Address): Observable<Address> {
    return this.http.post<Address>(this.base, address);
  }

  update(id: string, address: Address): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, address);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
