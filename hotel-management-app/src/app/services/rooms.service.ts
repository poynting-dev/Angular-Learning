import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { shareReplay } from 'rxjs';
import { AppConfig } from '../AppConfig/appconfig.interface';
import { APP_SERVICE_CONFIG } from '../AppConfig/appconfig.service';
import { RoomList } from '../rooms/IRoom';

@Injectable({
  providedIn: 'root',
})
export class RoomsService {
  // headers = new HttpHeaders({ token: 'jhgertwugdowaediohgewid' });
  getRooms$ = this.http.get<RoomList[]>('/api/rooms').pipe(shareReplay(1));

  constructor(
    @Inject(APP_SERVICE_CONFIG) private config: AppConfig,
    private http: HttpClient
  ) {
    console.log(config.apiEndpont);
    console.log('RoomsService initialized');
  }

  // roomsList: RoomList[] = [
  //   {
  //     roomNumber: 101,
  //     roomType: 'Single',
  //     ameneties: 'WiFi, TV, Air Conditioning',
  //     price: 99.99,
  //     photos: 'url_to_room_101_photo.jpg',
  //     checkInTime: new Date('2023-10-01T14:00:00'),
  //     checkOutTime: new Date('2023-10-05T11:00:00'),
  //   },
  //   {
  //     roomNumber: 102,
  //     roomType: 'Double',
  //     ameneties: 'WiFi, TV, Air Conditioning, Mini Bar',
  //     price: 129.99,
  //     photos: 'url_to_room_102_photo.jpg',
  //     checkInTime: new Date('2023-10-01T14:00:00'),
  //     checkOutTime: new Date('2023-10-05T11:00:00'),
  //   },
  //   {
  //     roomNumber: 201,
  //     roomType: 'Suite',
  //     ameneties: 'WiFi, TV, Air Conditioning, Mini Bar, Kitchenette',
  //     price: 199.99,
  //     photos: 'url_to_room_201_photo.jpg',
  //     checkInTime: new Date('2023-10-01T14:00:00'),
  //     checkOutTime: new Date('2023-10-05T11:00:00'),
  //   },
  //   {
  //     roomNumber: 202,
  //     roomType: 'Family',
  //     ameneties: 'WiFi, TV, Air Conditioning, Kitchenette, Sofa Bed',
  //     price: 159.99,
  //     photos: 'url_to_room_202_photo.jpg',
  //     checkInTime: new Date('2023-10-01T14:00:00'),
  //     checkOutTime: new Date('2023-10-05T11:00:00'),
  //   },
  //   {
  //     roomNumber: 301,
  //     roomType: 'Penthouse',
  //     ameneties: 'WiFi, TV, Air Conditioning, Private Pool, Kitchen',
  //     price: 299.99,
  //     photos: 'url_to_room_301_photo.jpg',
  //     checkInTime: new Date('2023-10-01T14:00:00'),
  //     checkOutTime: new Date('2023-10-05T11:00:00'),
  //   },
  // ];

  getRooms() {
    const headers = new HttpHeaders({ token: 'jhgertwugdowaediohgewid' });
    return this.http.get<RoomList[]>('/api/rooms', { headers: headers });
  }

  addRoom(room: RoomList) {
    return this.http.post<RoomList[]>('/api/rooms', room);
  }

  editRoom() {
    const room = {
      roomNumber: '3',
      roomType: 'Family - Updated',
      ameneties: 'WiFi, TV, Air Conditioning, Kitchenette, Sofa Bed',
      price: 159.99,
      photos: 'url_to_room_202_photo.jpg',
      checkInTime: new Date('2023-10-01T14:00:00'),
      checkOutTime: new Date('2023-10-05T11:00:00'),
    };
    return this.http.put<RoomList[]>(`/api/rooms/${room.roomNumber}`, room);
  }

  deleteRoom(id: string) {
    return this.http.delete<RoomList[]>(`/api/rooms/${id}`);
  }

  getPhotos() {
    const request = new HttpRequest(
      'GET',
      'https://jsonplaceholder.typicode.com/photos',
      {
        reportProgress: true,
      }
    );
    return this.http.request(request);
  }
}
