import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment, localStorageEnvironment } from '../../../environment';
import { StorageUtils } from '../../../utils/storage.utils';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  constructor(private http: HttpClient) { }
  private userService = inject(UserService);

  getData(): Observable<any> {
    return this.http.get(`${environment.production}/api/Profile`);
  }

  updateData(data: any): Observable<any> {
    return this.http.put(`${environment.production}/api/Profile`, data);
  }

  updateAvatar(formData: FormData): Observable<any> {
    return this.http.put(`${environment.production}/api/Profile/Avatar`, formData);
  }

  private operativeInfo(): Observable<any> {
    console.log('getOperativeInfo вызван');

    return this.http.post(`${environment.production}/api/Profile/GetOperativeInfo`, {}).pipe(
      tap({
        next: (response: any) => {
          this.userService.setOperativeInfo(response.data)
          console.log('getOperativeInfo response.data', response.data);
        },
        error: (error) => {

        },
        complete: () => {

        }
      })
    );
  }

  
  getOperativeInfo(){
    this.operativeInfo().subscribe((value:any)=>{

    })
  }

}
