import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PartnerType } from '../../../models/partner-type.interface';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root',
})
export class PartnerTypeService {
  constructor(private http: HttpClient) {}

  getData(): Observable<any> {
    return this.http.post<any>(
      `${environment.production}/api/Entities/PartnerType/Filter`,
      {},
    );
  }
}
