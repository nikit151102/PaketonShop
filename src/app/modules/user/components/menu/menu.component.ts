import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { localStorageEnvironment } from '../../../../../environment';
import { StorageUtils } from '../../../../../utils/storage.utils';

@Component({
  selector: 'app-menu',
  imports: [RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {

  constructor(private router: Router, private userService: UserService) { }

  logout() {
    this.userService.clearUser();
    StorageUtils.removeLocalStorageCache(localStorageEnvironment.auth.key)
    this.router.navigate(['']);

  }
}
