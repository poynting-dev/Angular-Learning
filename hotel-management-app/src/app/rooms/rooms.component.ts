import { HttpEventType } from '@angular/common/http';
import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  DoCheck,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  catchError,
  Head,
  map,
  Observable,
  of,
  Subject,
  Subscription,
} from 'rxjs';
import { RoomsService } from '../services/rooms.service';
import { HeaderComponent } from './header/header.component';
import { IRoom, RoomList } from './IRoom';
import { CommonModule } from '@angular/common';
import { RoomsListComponent } from './rooms-list/rooms-list.component';
@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.css'],
})
export class RoomsComponent
  implements OnInit, DoCheck, AfterViewInit, AfterViewChecked
{
  hotelName: string = 'Taj Hotel';
  hideRooms: boolean = true;

  error$ = new Subject<string>();

  getError$ = this.error$.asObservable();

  rooms$ = this.roomsService.getRooms$.pipe(
    catchError((err) => {
      console.log(err);
      this.error$.next(err.message);
      return of([]);
    })
  );

  roomsCount$ = this.roomsService.getRooms$.pipe(map((rooms) => rooms.length));

  subscription!: Subscription;

  stream = new Observable<string>((observer) => {
    observer.next('user1');
    observer.next('user2');
    observer.next('user3');
    observer.complete();
    // observer.error('error');
  });

  ngAfterViewChecked(): void {
    // console.log('');
  }
  ngAfterViewInit(): void {
    // console.log(this.headerComponent);
    this.headerComponent.title = 'Hilton Hotel';
    this.headerChildrenComponent.last.title = 'Last Title';
    this.headerChildrenComponent.get;
    console.log(this.headerChildrenComponent);
  }
  ngDoCheck(): void {
    console.log('on chnages is called');
  }

  toggle() {
    this.rooms.availableRooms++;
    this.title = 'Rooms List';
  }

  toggleHideRooms() {
    this.title = 'Rooms List';
    this.hideRooms = !this.hideRooms;
  }

  rooms: IRoom = {
    availableRooms: 5,
    bookedRooms: 5,
    totalRooms: 10,
  };

  selectedRoom!: RoomList;

  dummyRoomList: RoomList[] = [];

  title: string = 'Room List';

  @ViewChild(HeaderComponent, { static: true })
  headerComponent!: HeaderComponent;

  @ViewChildren(HeaderComponent)
  headerChildrenComponent!: QueryList<HeaderComponent>;

  totalBytes = 0;

  ngOnInit(): void {
    console.log(this.headerComponent);

    this.stream.subscribe((data) => {
      console.log(data);
    });
    this.stream.subscribe({
      next: (value) => console.log(value),
      complete: () => console.log('completed'),
      error: (err) => console.log(err),
    });

    this.roomsService.getPhotos().subscribe((event) => {
      switch (event.type) {
        case HttpEventType.Sent:
          console.log('Request has been made');
          break;
        case HttpEventType.DownloadProgress:
          console.log('Download Progress');
          this.totalBytes += event.loaded;
          break;
        case HttpEventType.Response:
          console.log('Response Received');
          console.log(this.totalBytes / (1024 * 1024) + ' MBs');
          console.log(event.body);
          break;
        case HttpEventType.UploadProgress:
          console.log('Upload Progress');
          break;
        case HttpEventType.ResponseHeader:
          console.log('Response Header received');
          break;
        default:
          console.log('Event not captured');
      }
    });

    // this.subscription = this.roomsService.getRooms$.subscribe((data) => {
    //   this.dummyRoomList = data;
    //   console.log(data);
    // });
  }

  selectRoom(room: RoomList): void {
    console.log(room);
    this.selectedRoom = room;
  }

  constructor(private roomsService: RoomsService) {
    console.log('API Called');
    // this.dummyRoomList = roomsService.getRooms();
  }

  addRoom(): void {
    const newRoom: RoomList = {
      // roomNumber: '4',
      roomType: 'Penthouse',
      amenities: 'WiFi, TV, Air Conditioning, Private Pool, Kitchen',
      price: 299.99,
      photos: 'url_to_room_301_photo.jpg',
      checkinTime: new Date('2023-10-01T14:00:00'),
      checkoutTime: new Date('2023-10-05T11:00:00'),
      rating: 4.2,
    };
    // this.dummyRoomList = [...this.dummyRoomList, newRoom];
    // this.dummyRoomList.push(newRoom);
    // console.log('room added! ' + this.dummyRoomList.length);

    this.roomsService.addRoom(newRoom).subscribe((data) => {
      this.dummyRoomList = data;
      console.log(data);
    });
  }

  editRoom() {
    this.roomsService.editRoom().subscribe((data) => {
      this.dummyRoomList = data;
    });
  }

  deleteRoom(roomNumber: string) {
    console.log('Deleted Room is ' + roomNumber);
    this.roomsService.deleteRoom(roomNumber).subscribe((data) => {
      this.dummyRoomList = data;
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
