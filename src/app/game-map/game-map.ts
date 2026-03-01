import { Component, OnInit, OnDestroy, ElementRef, viewChild, signal, computed } from '@angular/core';
import * as L from 'leaflet';
import { COUNTRIES, Country } from './countries';

export interface Industry {
  type: 'factory' | 'mine' | 'farm' | 'lumber' | 'oil';
  name: string;
  lat: number;
  lng: number;
}

const ICON_SIZE: L.PointTuple = [36, 36];

const INDUSTRY_ICONS: Record<Industry['type'], L.Icon> = {
  factory: L.icon({ iconUrl: 'assets/icons/factory.svg', iconSize: ICON_SIZE, iconAnchor: [18, 18] }),
  mine:    L.icon({ iconUrl: 'assets/icons/mine.svg',    iconSize: ICON_SIZE, iconAnchor: [18, 18] }),
  farm:    L.icon({ iconUrl: 'assets/icons/farm.svg',    iconSize: ICON_SIZE, iconAnchor: [18, 18] }),
  lumber:  L.icon({ iconUrl: 'assets/icons/lumber.svg',  iconSize: ICON_SIZE, iconAnchor: [18, 18] }),
  oil:     L.icon({ iconUrl: 'assets/icons/oil.svg',     iconSize: ICON_SIZE, iconAnchor: [18, 18] }),
};

const INDUSTRY_ICON_URLS: Record<Industry['type'], string> = {
  factory: 'assets/icons/factory.svg',
  mine:    'assets/icons/mine.svg',
  farm:    'assets/icons/farm.svg',
  lumber:  'assets/icons/lumber.svg',
  oil:     'assets/icons/oil.svg',
};

// Sample industries placed at real-world locations
const SAMPLE_INDUSTRIES: Industry[] = [
  { type: 'factory', name: 'Berlin Steelworks',     lat: 52.52,   lng: 13.405  },
  { type: 'mine',    name: 'Ural Iron Mine',        lat: 56.84,   lng: 60.60   },
  { type: 'farm',    name: 'Iowa Grain Farm',       lat: 41.88,   lng: -93.10  },
  { type: 'lumber',  name: 'Amazon Lumber Camp',    lat: -3.47,   lng: -62.21  },
  { type: 'oil',     name: 'Persian Gulf Refinery',  lat: 26.07,   lng: 50.55   },
  { type: 'factory', name: 'Shanghai Electronics',  lat: 31.23,   lng: 121.47  },
  { type: 'mine',    name: 'Witwatersrand Gold',    lat: -26.20,  lng: 28.04   },
  { type: 'farm',    name: 'Punjab Wheat Fields',   lat: 30.90,   lng: 75.85   },
  { type: 'lumber',  name: 'Scandinavian Timber',   lat: 63.42,   lng: 14.55   },
  { type: 'oil',     name: 'Texas Oil Rig',         lat: 31.97,   lng: -102.07 },
];

@Component({
  selector: 'app-game-map',
  imports: [],
  templateUrl: './game-map.html',
  styleUrl: './game-map.scss',
})
export class GameMap implements OnInit, OnDestroy {
  private readonly mapContainer = viewChild.required<ElementRef>('mapContainer');
  private map!: L.Map;
  private layerGroups = new Map<string, L.LayerGroup>();

  readonly industryTypes: Industry['type'][] = Object.keys(INDUSTRY_ICONS) as Industry['type'][];
  readonly activeFilters = signal<Set<string>>(new Set(this.industryTypes));

  readonly zoomLevels = [
    { label: '100%', zoom: 3 },
    { label: '150%', zoom: 5 },
    { label: '175%', zoom: 6 },
    { label: '200%', zoom: 7 },
  ];
  readonly activeZoom = signal('100%');

  readonly countrySearch = signal('');
  readonly dropdownOpen = signal(false);
  readonly highlightedIndex = signal(-1);
  readonly filteredCountries = computed(() => {
    const query = this.countrySearch().toLowerCase().trim();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(query));
  });

  private getActiveZoomLevel(): number {
    const label = this.activeZoom();
    return this.zoomLevels.find(l => l.label === label)?.zoom ?? 3;
  }

  goToCountry(country: Country): void {
    this.map.flyTo([country.lat, country.lng], this.getActiveZoomLevel(), { duration: 1.2 });
    this.countrySearch.set(country.name);
    this.dropdownOpen.set(false);
    this.highlightedIndex.set(-1);
  }

  onSearchInput(event: Event): void {
    this.countrySearch.set((event.target as HTMLInputElement).value);
    this.dropdownOpen.set(true);
    this.highlightedIndex.set(-1);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const countries = this.filteredCountries();
    if (!countries.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.dropdownOpen.set(true);
        this.highlightedIndex.update(i => (i + 1) % countries.length);
        this.scrollToHighlighted();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.dropdownOpen.set(true);
        this.highlightedIndex.update(i => (i - 1 + countries.length) % countries.length);
        this.scrollToHighlighted();
        break;
      case 'Enter':
        event.preventDefault();
        const idx = this.highlightedIndex();
        if (idx >= 0 && idx < countries.length) {
          this.goToCountry(countries[idx]);
        }
        break;
      case 'Escape':
        this.dropdownOpen.set(false);
        this.highlightedIndex.set(-1);
        break;
    }
  }

  onSearchFocus(): void {
    this.dropdownOpen.set(true);
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.dropdownOpen.set(false);
      this.highlightedIndex.set(-1);
    }, 200);
  }

  private scrollToHighlighted(): void {
    requestAnimationFrame(() => {
      const el = document.querySelector('.country-option.highlighted');
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  iconUrl(type: Industry['type']): string {
    return INDUSTRY_ICON_URLS[type];
  }

  isActive(type: string): boolean {
    return this.activeFilters().has(type);
  }

  setZoom(level: { label: string; zoom: number }): void {
    this.map.setZoom(level.zoom, { animate: true });
    this.activeZoom.set(level.label);
  }

  toggleIndustry(type: string): void {
    const current = this.activeFilters();
    const next = new Set(current);
    const group = this.layerGroups.get(type);
    if (!group) return;

    if (next.has(type)) {
      next.delete(type);
      this.map.removeLayer(group);
    } else {
      next.add(type);
      group.addTo(this.map);
    }
    this.activeFilters.set(next);
  }

  ngOnInit(): void {
    this.map = L.map(this.mapContainer().nativeElement, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      scrollWheelZoom: false,
      zoomControl: false,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://stamen.com/">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(this.map);

    this.addIndustries(SAMPLE_INDUSTRIES);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private addIndustries(industries: Industry[]): void {
    // Create a layer group per industry type
    for (const type of this.industryTypes) {
      this.layerGroups.set(type, L.layerGroup());
    }

    // Add markers to their type's layer group
    for (const ind of industries) {
      const marker = L.marker([ind.lat, ind.lng], { icon: INDUSTRY_ICONS[ind.type] })
        .bindPopup(`<strong>${ind.name}</strong><br>Type: ${ind.type}`);
      this.layerGroups.get(ind.type)!.addLayer(marker);
    }

    // Add all layer groups to the map
    for (const group of this.layerGroups.values()) {
      group.addTo(this.map);
    }
  }
}
