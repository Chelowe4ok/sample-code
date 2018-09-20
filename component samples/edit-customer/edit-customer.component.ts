import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap  } from '@angular/router';

import { HoliService } from '../../../../shared/services/holi/holi.service';
import { Customer } from '../../../../models';

@Component({
  selector: 'app-edit-customer',
  templateUrl: './edit-customer.component.html',
  styleUrls: ['./edit-customer.component.scss']
})
export class EditCustomerComponent implements OnInit {
    customer: Customer;
    customerForm: FormGroup;
    constructor(
        private formBuilder: FormBuilder,
        private holiService: HoliService,
        private router: Router,
        private route: ActivatedRoute,
    ) { }

    ngOnInit() {
        this.initData();
    }

    onSendForm(customer: Customer) {
      this.holiService.updateCustomer(customer).subscribe(customer => {
            this.router.navigate(['dashboard', 'customers']);
      });
    }

    back() {
      this.router.navigate(['dashboard', 'customers']);
    }

    private initData() {
        this.customer = this.route.snapshot.data.customer;
    }
}
