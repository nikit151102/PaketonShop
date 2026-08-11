import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root',
})
export class PartnerService {
  constructor(private http: HttpClient) { }

  getPartnersUser(): Observable<any> {
    return this.http.post(
      `${environment.production}/api/Profile/UserCompanies/Filter`,
      {
        "filters": [
        ],
        "sorts": [
        ],
        "page": 0,
        "pageSize": 100
      },
    );
  }

  getPartnerById(partnerId: string): Observable<any> {
    return this.http.get(
      `${environment.production}/api/Profile/UserCompanies/${partnerId}`,
    );
  }

    getPartnerUser(partnerId: string): Observable<any> {
    return this.http.get(
      `${environment.production}/api/Profile/UserCompanies/${partnerId}`,
    );
  }

  setPartnerUser(partner: any): Observable<any> {
    return this.http.post(
      `${environment.production}/api/Profile/UserCompanies`, partner,
    );
  }

  updatePartnerUser(data: any): Observable<any> {
    return this.http.put(
      `${environment.production}/api/Profile/UserCompanies`,
      data,
    );
  }

  deletePartnersUser(partnerId: string): Observable<any> {
    return this.http.delete(
      `${environment.production}/api/Profile/UserCompanies/${partnerId}`,
    );
  }

  getPartnerByInn(inn: string): Observable<any> {
  return this.http.get<any>(`${environment.production}/GetByInn/${inn}`);
}

  /**
   * Проверка ИП/самозанятого
   * @param inn - ИНН ИП/самозанятого
   * @param type - тип налогоплатильщика  ИП - 0 /самозанятого - 1
   * @returns Observable
   */
  selfEmployedInnChecker(inn: string, type: number = 0): Observable<any> {
    return this.http.post<any>(`${environment.production}/api/Services/InnChecker/check`, 
       {
          inn: inn,
          type: type
        }
    );
  }
}
