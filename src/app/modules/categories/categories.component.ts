import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { CategorySectionComponent } from '../../core/components/category-section/category-section.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CategorySectionComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  
  categoryId!: string;
  categoryData: any;
  subCategories: any;

  constructor(private route: ActivatedRoute, private categoryService: CategoryService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.categoryId = params.get('id')!;
      this.categoryService.getCategoryById(this.categoryId).subscribe((data: any) => {
        this.categoryData = data.data;
        this.subCategories = data.data.subCategories;
      })
    });
  }
}
