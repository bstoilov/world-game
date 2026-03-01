import { Component } from '@angular/core';
import { GameMap } from './game-map/game-map';

@Component({
  selector: 'app-root',
  imports: [GameMap],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
