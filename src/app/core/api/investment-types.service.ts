import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class InvestmentTypesService {
  constructor(private http: HttpClient) {}

  getData(filter: any): Observable<any> {
    return this.http.post<any>(
      `${environment.production}/api/Entities/InvestmentType/Filter`,
      filter,
    );
  }
}
