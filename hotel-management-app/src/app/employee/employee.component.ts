import { Component, Inject, OnInit, Self } from '@angular/core';
import { AppConfig } from '../AppConfig/appconfig.interface';
import { APP_SERVICE_CONFIG } from '../AppConfig/appconfig.service';
import { RoomsService } from '../services/rooms.service';

@Component({
  selector: 'app-employee',
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.css'],
  providers: [RoomsService],
})
export class EmployeeComponent implements OnInit {
  empName: string = 'John Doe';

  constructor(@Inject(APP_SERVICE_CONFIG) private config: AppConfig) {
    console.log(config.apiEndpont);
  }

  // constructor(@Self() private roomsService: RoomsService) {
  //   console.log(roomsService.getRooms());
  // }

  ngOnInit(): void {}
}
