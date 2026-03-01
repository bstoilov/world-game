import { Component, OnInit, OnDestroy, ElementRef, viewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-game-map',
  imports: [],
  templateUrl: './game-map.html',
  styleUrl: './game-map.scss',
})
export class GameMap implements OnInit, OnDestroy {
  private readonly mapContainer = viewChild.required<ElementRef>('mapContainer');
  private map!: L.Map;

  ngOnInit(): void {
    this.map = L.map(this.mapContainer().nativeElement, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(this.map);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
