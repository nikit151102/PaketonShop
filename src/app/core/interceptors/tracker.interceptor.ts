
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class TrackerInterceptor implements HttpInterceptor {
  
  private readonly TRACKING_URL = 'https://xn--o1ab.xn--80akonecy.xn--p1ai/track/track';
  private trackedTags: Set<string> = new Set();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const trackerTag = urlParams.get('trackerTag');

    if (trackerTag && !this.trackedTags.has(trackerTag)) {
      this.sendTrackingData(trackerTag, url);
      this.trackedTags.add(trackerTag);
    }

    return next.handle(req);
  }

  private sendTrackingData(tag: string, url: string): void {
    const trackingData = {
      url: url,
      tag: tag
    };

    fetch(this.TRACKING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(trackingData)
    }).catch(error => {
      console.error('Ошибка отправки данных трекинга:', error);
    });
  }
}