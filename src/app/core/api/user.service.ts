import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment, localStorageEnvironment } from '../../../environment';
import { StorageUtils } from '../../../utils/storage.utils';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  constructor(private http: HttpClient) {}

  getData(): Observable<any> {
    return this.http.get(`${environment.production}/api/Profile`);
  }

  updateData(data: any): Observable<any> {
    return this.http.put(`${environment.production}/api/Profile`, data);
  }

   updateAvatar(formData: FormData): Observable<any> {
    return this.http.put(`${environment.production}/api/Profile/Avatar`, formData);
  }

}
