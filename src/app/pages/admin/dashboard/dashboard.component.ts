import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  grafanaSectorUrl!: SafeResourceUrl;
  grafanaRevenueUrl!: SafeResourceUrl;
  private sanitizer = inject(DomSanitizer);

  ngOnInit() {
    const rawUrl = 'http://localhost:3000/d-solo/ad4g45h/new-dashboard?orgId=1&timezone=browser&panelId=panel-1';
    // Le decimos a Angular que confíe en esta URL para usarla en un iframe
    this.grafanaSectorUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);

    const revenueRawUrl = 'http://localhost:3000/d-solo/ad4g45h/new-dashboard?orgId=1&timezone=browser&panelId=panel-2';
    this.grafanaRevenueUrl = this.sanitizer.bypassSecurityTrustResourceUrl(revenueRawUrl);
  }
}
