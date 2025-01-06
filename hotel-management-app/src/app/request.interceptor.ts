import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpHeaders,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class RequestInterceptor implements HttpInterceptor {
  constructor() {}

  headers = new HttpHeaders({ token: 'jhgertwugdowaediohgewid' });
  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    console.log('Request HTTP Interceptor: ');
    console.log(request);
    const newRequest = request.clone({ headers: this.headers });
    if (request.method === 'POST') {
      return next.handle(newRequest);
    } else {
      return next.handle(request);
    }
  }
}
