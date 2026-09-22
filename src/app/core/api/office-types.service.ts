import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class OfficeTypesService {
  constructor(private http: HttpClient) {}

  getData(filter: any): Observable<any> {
    return this.http.post<any>(
      `${environment.production}/api/Entities/OfficeType/Filter`,
      filter,
    );
  }
}
