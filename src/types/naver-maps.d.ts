declare global {
  interface Window {
    naver?: {
      maps: {
        LatLng: new (lat: number, lng: number) => any;
        LatLngBounds: new (sw: any, ne: any) => any;
        Point: new (x: number, y: number) => any;
        Map: new (element: HTMLElement | string, options?: any) => any;
        Marker: new (options: any) => any;
        Event: {
          addListener(target: any, eventName: string, listener: (...args: any[]) => void): any;
          removeListener(listener: any): void;
          clearListeners(target: any, eventName: string): void;
          trigger(target: any, eventName: string, ...args: any[]): void;
        };
      };
    };
  }
}

declare namespace naver {
  namespace maps {
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw: LatLng, ne: LatLng);
      extend(latlng: LatLng): LatLngBounds;
      getCenter(): LatLng;
      getSW(): LatLng;
      getNE(): LatLng;
    }

    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
    }

    interface MapOptions {
      center?: LatLng;
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
      zoomControl?: boolean;
      [key: string]: any;
    }

    class Map {
      constructor(element: HTMLElement | string, options?: MapOptions);
      setCenter(center: LatLng): void;
      getCenter(): LatLng;
      setZoom(zoom: number, effect?: boolean): void;
      getZoom(): number;
      fitBounds(bounds: LatLngBounds, margin?: number): void;
      panTo(coord: LatLng, transition?: boolean): void;
      panBy(offset: Point): void;
      destroy(): void;
      getProjection(): Projection | null;
      [key: string]: any;
    }

    interface Projection {
      fromCoordToPoint(coord: LatLng): Point;
      fromPointToCoord(point: Point): LatLng;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map | null;
      icon?: any;
      title?: string;
      [key: string]: any;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPosition(position: LatLng): void;
      getPosition(): LatLng;
      setTitle(title: string): void;
      getTitle(): string;
      [key: string]: any;
    }

    class Event {
      static addListener(
        target: any,
        eventName: string,
        listener: (...args: any[]) => void,
      ): MapEventListener;
      static removeListener(listener: MapEventListener): void;
      static clearListeners(target: any, eventName: string): void;
      static trigger(target: any, eventName: string, ...args: any[]): void;
    }

    interface MapEventListener {
      remove(): void;
    }
  }
}

export {};
