import { Component, Output, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export enum ContactTypeEnum {
  Call = 0,
  DoNotCallAndReplace = 1,
  DoNotCallAndDelete = 2
}

export interface ContactTypeOption {
  value: ContactTypeEnum;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

@Component({
  selector: 'app-contact-type-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-type-selector.component.html',
  styleUrls: ['./contact-type-selector.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContactTypeSelectorComponent),
      multi: true
    }
  ]
})
export class ContactTypeSelectorComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Output() contactTypeChange = new EventEmitter<number>();
  @Input() selectedType: ContactTypeEnum = ContactTypeEnum.Call;
  @Input() orderStatus: number | null = null;
  @Input() disabled = false;
  @Input() showLabels = true;
  @Input() showDescriptions = true;
  @Input() variant: 'default' | 'compact' | 'cards' = 'default';

  ContactTypeEnum = ContactTypeEnum;

  selectedValue: number = ContactTypeEnum.Call;

  options: ContactTypeOption[] = [
    {
      value: ContactTypeEnum.Call,
      label: 'Позвонить',
      description: 'Если товара нет в нужном количестве, свяжемся с вами для согласования',
      icon: '',
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)'
    },
    {
      value: ContactTypeEnum.DoNotCallAndReplace,
      label: 'Заменить на аналог',
      description: 'Автоматически заменим отсутствующий товар на аналогичный без звонка',
      icon: '',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)'
    },
    {
      value: ContactTypeEnum.DoNotCallAndDelete,
      label: 'Убрать позицию',
      description: 'Удалим отсутствующий товар из заказа без дополнительного согласования',
      icon: '',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)'
    }
  ];

  private onChange: any = () => { };
  private onTouched: any = () => { };
  
  get visibleOptions(): ContactTypeOption[] {
    if (this.isReadOnly) {
      const selected = this.options.find(opt => opt.value === this.selectedValue);
      return selected ? [selected] : [];
    }
    return this.options;
  }

  get isReadOnly(): boolean {
    return this.orderStatus !== null && this.orderStatus !== 0;
  }

  get isDisabled(): boolean {
    return this.disabled || this.isReadOnly;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedType'] && !changes['selectedType'].isFirstChange()) {
      this.selectedValue = changes['selectedType'].currentValue;
    }
  }

  ngOnInit(): void {
    this.selectedValue = this.selectedType;
  }

  get currentOption(): ContactTypeOption | undefined {
    return this.options.find(opt => opt.value === this.selectedValue);
  }

  selectType(value: ContactTypeEnum): void {
    if (this.isDisabled) return;

    this.selectedValue = value;
    this.selectedType = value;
    this.onChange(value);
    this.onTouched();
    this.contactTypeChange.emit(value);
  }

  getValue(): number {
    return this.selectedValue;
  }

  setValue(value: number): void {
    if (this.isDisabled) return;
    
    this.selectedValue = value;
    this.selectedType = value;
    this.onChange(value);
    this.contactTypeChange.emit(value);
  }

  writeValue(value: number): void {
    if (value !== undefined && value !== null) {
      this.selectedValue = value;
      this.selectedType = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  getOptionLabel(value: number): string {
    const option = this.options.find(opt => opt.value === value);
    return option ? option.label : '';
  }

  getOptionDescription(value: number): string {
    const option = this.options.find(opt => opt.value === value);
    return option ? option.description : '';
  }

  getOptionIcon(value: number): string {
    const option = this.options.find(opt => opt.value === value);
    return option ? option.icon : '';
  }
}