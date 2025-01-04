import {
  Component,
  OnInit,
  Input,
  EventEmitter,
  Output,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { Observable } from 'rxjs';
import { IRoom, RoomList } from '../IRoom';

@Component({
  selector: 'app-rooms-list',
  templateUrl: './rooms-list.component.html',
  styleUrls: ['./rooms-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomsListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() rooms: IRoom;

  @Input() title: string = '';

  @Input() dummyRoomList: RoomList[] = [];

  @Output() selectedRoom = new EventEmitter<RoomList>();

  @Output() deletedRoom = new EventEmitter<string>();

  constructor() {}
  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
    if (changes['title']) {
      this.title = changes['title'].currentValue.toUpperCase();
    }
  }

  ngOnInit(): void {}

  selectRoom(room: RoomList) {
    this.selectedRoom.emit(room);
  }

  deleteRoom(index: string) {
    this.deletedRoom.emit(index);
  }

  ngOnDestroy(): void {
    console.log('Rooms List Component Destroyed');
  }
}
