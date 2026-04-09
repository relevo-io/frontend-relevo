import { Component, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.css'
})
export class SearchInputComponent {
  // Input: Placeholder personalizable para cada página
  placeholder = input<string>('Buscar...');
  
  // Output: Emite el valor buscado al padre (nueva sintaxis output de Ng 18+)
  onSearch = output<string>();

  onInputChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.onSearch.emit(value);
  }
}
