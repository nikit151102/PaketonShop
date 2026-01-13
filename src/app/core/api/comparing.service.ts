import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComparingService {

  constructor(private http: HttpClient) { }

  getComparing(): Observable<any> {
    return this.http.get(`${environment.production}/api/Profile/CompareProducts`)
  }

  setCompareProduct(productId: string): Observable<any> {
    return this.http.post(`${environment.production}/api/Entities/ProductInstance/Comparing/${productId}`, [productId])
  }

  deleteCompareProduct(productId: string): Observable<any> {
    return this.http.delete(`${environment.production}/api/Entities/ProductInstance/Uncomparing/${productId}`)
  }

}
