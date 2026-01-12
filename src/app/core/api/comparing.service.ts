import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComparingService {

  constructor(private http: HttpClient) { }

  getComparing(filters: {
    "field": string,
    "values": string[],
    "type": number
  }[] | [], page: number, pageSize: any): Observable<any> {
    return this.http.post(`${environment.production}/api/Profile/Comparing/Filter`, {
      "filters": filters,
      "sorts": [],
      "page": page,
      "pageSize": pageSize
    })
  }

  setCompareProduct(productId: string): Observable<any> {
    return this.http.post(`${environment.production}/api/Entities/ProductInstance/CompareProducts`, [productId])
  }

  deleteCompareProduct(productId: string): Observable<any> {
    return this.http.delete(`${environment.production}/api/Entities/ProductInstance/Uncomparing/${productId}`)
  }

}
