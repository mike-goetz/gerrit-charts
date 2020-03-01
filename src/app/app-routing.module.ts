import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {GerritDashboardComponent} from './view/gerrit-dashboard/gerrit-dashboard.component';


const routes: Routes = [{
  path: '',
  component: GerritDashboardComponent
}];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
