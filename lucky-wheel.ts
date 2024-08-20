import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { NgxLoadingModule } from 'ngx-loading';
import { DataService } from './data.service';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { GlobalDataService } from '../services/global.service';
import { ApiService } from '../services/api.service';
import Swal from 'sweetalert2'

const COLORS = ['#570F63', '#6C1C95', '#987ACF', '#D7D2EF', '#570F63', '#6C1C95', '#987ACF']; // '#D7D2EF', '#570F63', '#6C1C95', '#987ACF', '#D7D2EF',
const _defaultOpts = [
  "200 USD", 
  "300 USD",
  "500 USD", 
  "1000 USD", 
  "2000 USD", 
  "5000 USD", 
  "4000 USD", 
];

@Component({
  selector: 'app-wheel',
  standalone: true,
  imports: [CommonModule, NgxLoadingModule],
  templateUrl: './wheel.component.html',
  styleUrls: ['./wheel.component.scss']
})
export class WheelComponent implements OnInit {
  @ViewChild('wheel') wheel!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spin') spin!: ElementRef;
  colors = ['#f82', '#0bf', '#fb0', '#0fb', '#b0f', '#f0b', '#bf0'];
  sectors?: any[] = [];

  rand = (m: any, M: any) => Math.random() * (M - m) + m;
  tot: any;
  ctx: any;
  dia: any;
  rad: any;
  PI: any;
  TAU: any;
  arc0: any;

  winners = [];

  modeDelete = true;
	isDissible = false;

  friction = 0.995; // 0.995=soft, 0.99=mid, 0.98=hard
  angVel = 0; // Angular velocity
  ang = 0; // Angle in radians
  lastSelection: any;
  userInfo: any;
  isJackspot = false;

  constructor(
    private dataService: DataService,
    private bottomSheetRef: MatBottomSheetRef<WheelComponent>,
    private globalDataService: GlobalDataService,
    private apiService: ApiService,
  ) {
    this.sectors = _defaultOpts?.map((opts, i) => {
      return {
        color: COLORS[(i >= COLORS.length ? i + 1 : i) % COLORS.length],
        label: opts,
      };
    });
  }

  ngDoCheck(): void {
    this.engine();
  }

  ngOnInit() {
    this.userInfo = this.globalDataService.loadUserInfo();
  }

  ngAfterViewInit(): void {
    this.createWheel();
  }

  createWheel() {
    if (!this.sectors) {
      return;
    }
    this.ctx = this.wheel.nativeElement.getContext('2d');
    this.dia = this.ctx.canvas.width;
    this.tot = this.sectors?.length;
    this.rad = this.dia / 2;
    this.PI = Math.PI;
    this.TAU = 2 * this.PI;

    this.arc0 = this.TAU / this.sectors.length;
    this.sectors.forEach((sector, i) => this.drawSector(sector, i));
    this.rotate(true);
    this.restartWinner();
  }

  mod = (n: number, m: number) => (n % m + m) % m;

  spinner() {
	this.isDissible = true;
    this.spinLuckyWheel()
  }

  spinToSector(sectorIdx: number, data: any) {
    let angNew = this.arc0 * sectorIdx
    angNew -= this.rand(0, this.arc0)
    angNew = this.mod(angNew, this.TAU)

    const angAbs = this.mod(this.ang, this.TAU)

    const angDiff = this.mod(angNew - angAbs, this.TAU)
    const rev = this.TAU * Math.floor(this.rand(4, 6)) // extra 4 or 5 full turns
    this.ang += angDiff + rev;

    const spinAnimation = this.wheel.nativeElement.animate([{ rotate: `${this.ang}rad` }], {
      duration: this.rand(4000, 8000),
      easing: "cubic-bezier(0.2, 0, 0.1, 1)",
      fill: "forwards"
    });

    spinAnimation.addEventListener("finish", () => {
      // TODO
    });
  }

  spinLuckyWheel() {
    const data = { user_id: this.userInfo.user.id }

    // TODO: Get the sector Idx from backend

    // Spin to the specific sector
    this.spinToSector(this.tot - sectorIdx, data)
  }

  getIndex = () =>
    Math.floor(this.tot - (this.ang / this.TAU) * this.tot) % this.tot;

  reverseIndex(idx: any) {
    return ((this.tot - idx) / this.tot) * this.TAU;
  }

  drawSector(sector: any, i: any) {
    const ang = this.arc0 * i;
    this.ctx.save();
    // COLOR
    this.ctx.beginPath();
    this.ctx.fillStyle = sector.color;
    this.ctx.moveTo(this.rad, this.rad);

    this.ctx.arc(this.rad, this.rad, this.rad, ang, ang + this.arc0);
    this.ctx.lineTo(this.rad, this.rad);
    this.ctx.fill();
    // TEXT
    this.ctx.translate(this.rad, this.rad);
    this.ctx.rotate(ang + this.arc0 / 2);
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.fillText(sector.label, this.rad - 30, 8);
    //
    this.ctx.restore();
  }

  rotate(first = false) {
    if (!this.sectors) {
      return;
    }
    const sector = this.sectors[this.getIndex()];
    this.ctx.canvas.style.transform = `rotate(${this.ang - this.PI / 2}rad)`;
    if (!first) {
      this.lastSelection = !this.angVel ? this.lastSelection : this.getIndex();
      this.deleteOption();
    }
  }

  frame() {
    if (!this.angVel) return;

    this.angVel *= this.friction; // Decrement velocity by friction
    if (this.angVel < 0.002) this.angVel = 0; // Bring to stop
    this.ang += this.angVel; // Update angle
    this.ang %= this.TAU; // Normalize angle
    this.rotate();
  }

  engine() {
    requestAnimationFrame(this.frame.bind(this));
  }

  deleteOption() {
    if (!this.sectors) {
      return;
    }
    if (this.modeDelete && !this.angVel) {
      console.log('eliminar', this.lastSelection);
      this.addNewWinner(this.sectors[this.lastSelection].label);
      // this.spin.nativeElement.textContent =
      //   this.sectors[this.lastSelection].label;
      // this.sectors.splice(this.lastSelection, 1);
      setTimeout(() => {
        this.createWheel();
      }, 1200);
    }
  }

  restartWinner() {
    //this.dataService.restartWinners();
  }

  addNewWinner(value: any) {
    this.dataService.addWinner(value);
  }

  close(): void {
    this.bottomSheetRef.dismiss();
  }
}
