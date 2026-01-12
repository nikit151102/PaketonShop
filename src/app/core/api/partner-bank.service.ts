import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class PartnerBankService {
  constructor(private http: HttpClient) {}

  getBanks(): Observable<any> {
    return this.http.post(
      `${environment.production}/api/Entities/PartnerBank/Filter`,
      {
        filters: [],
        page: 0,
        pageSize: 100
      }
    );
  }
}