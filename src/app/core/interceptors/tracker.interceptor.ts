import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Observable } from 'rxjs';
import { StorageUtils } from '../../../utils/storage.utils';
import { localStorageEnvironment } from '../../../environment';

@Injectable()
export class TrackerInterceptor implements HttpInterceptor {

  private readonly TRACKING_URL = 'https://xn--o1ab.xn--80akonecy.xn--p1ai/track/track';
  private trackedTags: Set<string> = new Set();
  private pkt_sourceTag: Set<string> = new Set();
  
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 🔒 Трекинг работает ТОЛЬКО в браузере
    if (!isPlatformBrowser(this.platformId)) {
      return next.handle(req);
    }

    const location = this.document.location;
    if (!location) {
      return next.handle(req);
    }

    const url = location.href;
    const urlParams = new URLSearchParams(location.search);
    const trackerTag = urlParams.get('trackerTag');

    if (trackerTag && !this.trackedTags.has(trackerTag)) {
      this.sendTrackingData(trackerTag, url);
      this.trackedTags.add(trackerTag);
    }

    const pkt_source = urlParams.get('pkt_source');
    if (pkt_source && !this.pkt_sourceTag.has(pkt_source)) {
      StorageUtils.setLocalStorageCache(
        localStorageEnvironment.pktSource.key,
        pkt_source,
        localStorageEnvironment.pktSource.ttl
      );
      this.pkt_sourceTag.add(pkt_source);
    }

    return next.handle(req);
  }

  private sendTrackingData(tag: string, url: string): void {
    const trackingData = { url, tag };

    fetch(this.TRACKING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(trackingData)
    }).catch(error => {});
  }
}