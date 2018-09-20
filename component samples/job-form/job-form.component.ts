import { Component, OnInit, NgZone, ViewChild, ViewChildren, QueryList, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl  } from '@angular/forms';

import { HoliService } from '../../services/holi/holi.service';
import { EnvironmentsService } from '../../services/environments.service';

import { User, Job, Step, Note } from '../../../models';

declare var GoogleMapsLoader: any;

@Component({
  selector: 'job-form',
  templateUrl: './job-form.component.html',
  styleUrls: ['./job-form.component.scss']
})
export class JobFormComponent implements OnInit {

  @Input('job') job: Job;
  @Input('users') users: User[];
  @Input('template') template: any;
  @Input('isTemplate') isTemplate: boolean = false;
  @Input('cancleBtnName') cancleBtnName: string = 'Exit';
  @Input('submitBtnName') submitBtnName: string = 'Create Job';

  @Output() onSendedForm: EventEmitter<any> = new EventEmitter();
  @Output() exit: EventEmitter<any> = new EventEmitter();

  @ViewChild('customerAddressInputElement') customerAddressInputElement: any;
  @ViewChildren('stepAddressInputElements') stepAddressInputElements: QueryList<any>;

  public jobForm: FormGroup;
  public finedAddresses: any[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private holiService: HoliService,
    private environmentsService: EnvironmentsService,
  ) { }

  ngOnInit() {
    this.initForms();
    this.initGoogleLocationLibraty();
  }

  onSearchAddress(address: string): void {

    const geocodeStringAddress = address.replace(/\s/ig, '+');

    if (!geocodeStringAddress) {
      this.finedAddresses = [];
      return;
    }

    this.holiService.getCoordiantesByAddress(geocodeStringAddress).subscribe(address => {
      this.finedAddresses = address.results;
      console.log(address);
    });

  }

  onSendForm(): void {
    this.onSendedForm.emit(this.jobForm.value);
  }

  delete(): void {
    this.holiService.deleteJob(this.job._id).subscribe(() => {
      this.exit.emit();
    });
  }

  onExit(): void {
    this.exit.emit();
  }

  selectAddress(address: any, index: number): void {
    const groupArray = this.jobForm.get('steps') as FormArray;

    this.holiService.getW3WCoorinates(address.geometry.location.lat(), address.geometry.location.lng())
      .then((data: any) => {
        groupArray.controls[index].patchValue({
          address: address.formatted_address,
          latitude: address.geometry.location.lat(),
          longitude: address.geometry.location.lng(),
          w3w_address: data.words
        });
      })
      .catch(error => {
        groupArray.controls[index].patchValue({
          address: address.formatted_address,
          latitude: address.geometry.location.lat(),
          longitude: address.geometry.location.lng(),
          w3w_address: null
        });
      });
  }

  selectCustomerAddress(address: any): void {

    this.holiService.getW3WCoorinates(address.geometry.location.lat(), address.geometry.location.lng())
      .then((data: any) => {
        this.jobForm.get('customer').patchValue({
          site_address: address.formatted_address,
          latitude: address.geometry.location.lat(),
          longitude: address.geometry.location.lng(),
          w3w_address: data.words
        });
      })
      .catch(error => {
        this.jobForm.get('customer').patchValue({
          site_address: address.formatted_address,
          latitude: address.geometry.location.lat(),
          longitude: address.geometry.location.lng(),
          w3w_address: null
        });
      });    
  }

  onAddNoteField(): void {
    let notes = this.getFormGroupArray('notes');
    notes.push(this.createNoteField());
  }

  onRemoveNoteField(index: number): void {
    this.getFormGroupArray('notes').removeAt(index);
  }

  onAddStepField(): void {
    let steps = this.getFormGroupArray('steps');
    steps.push(this.createStepField());
  }

  onRemoveStepField(index: number): void {
    this.getFormGroupArray('steps').removeAt(index);
  }

  getFormGroupArray(group: string): FormArray {
    return <FormArray>this.jobForm.get(group) as FormArray;
  }

  private initForms(): void {
    this.jobForm = this.formBuilder.group({
      edit: this.formBuilder.group({
        templateName: this.template ? [this.job ? this.job.template : null, Validators.required] : this.job ? this.job.template : null,
        name: [this.job ? this.job.customer : null, Validators.required],
        jobs: [1, Validators.required],
      }),
      customer: this.formBuilder.group({
        first_name_site: null,
        last_name_site: null,
        phone_site: null,
        mobile_site: null,
        email_site: [null, [Validators.required, Validators.email]],
        fax_site: null,
        site_address: null,
        customer_holi_id: null,
        latitude_site: null,
        longitude_site: null,
        w3w_address_site: null,
      }),
      notes: this.formBuilder.array([]),
      assign: this.formBuilder.group({
        worker_id: this.job ? this.job.assign.worker._id : null,
        start_at: null,
        duration: null, 
      }),
      steps: this.formBuilder.array([])
    });

    if (this.job) {
      this.jobForm.patchValue({
        edit: this.job.edit,
        customer: this.job.customer ?
          this.job.customer :
          {
            first_name_site: null,
            last_name_site: null,
            phone_site: null,
            mobile_site: null,
            email_site: null,
            fax_site: null,
            site_address: null,
            customer_holi_id: null,
            latitude_site: null,
            longitude_site: null,
            w3w_address_site: null,
          },
        assign: this.job.assign
      });

      this.job.notes.forEach(note => {
        let notes = this.getFormGroupArray('notes');
        notes.push(this.createNoteField(note));
      });

      this.job.steps.forEach(step => {
        let steps = this.getFormGroupArray('steps');
        steps.push(this.createStepField(step));
      });

    }
  }

  private createNoteField(note: Note = null): FormGroup {
    return this.formBuilder.group({
      note: [note ? note.note : null, Validators.required],
    });
  }

  private createStepField(step: Step = null): FormGroup {
    return this.formBuilder.group({
      name: [step ? step.name : null, Validators.required],
      address: step ? step.address : null,
      latitude: step ? step.latitude : null,
      longitude: step ? step.longitude : null,
      w3w_address: step ? step.w3w_address : null
    });
  }

  private initGoogleLocationLibraty(): void {
    GoogleMapsLoader.KEY = this.environmentsService.GOOGLE_MAP_API_KEY;
    GoogleMapsLoader.LIBRARIES = ['geometry', 'places'];
    GoogleMapsLoader.load((google: any) => {

      let autocomplete = new google.maps.places.Autocomplete(this.customerAddressInputElement.nativeElement, {
        types: ["geocode"]
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const location = place.geometry.location;
        this.selectCustomerAddress(place);
      });


      // dynamic attach autocomple from google places library
      (this.jobForm.get('steps') as FormArray).valueChanges.subscribe((values) => {

        setTimeout(() => {
          if (this.stepAddressInputElements.length === 0) return;

          const id = this.stepAddressInputElements['last'].nativeElement.id;

          let autocompleteStep = new google.maps.places.Autocomplete(this.stepAddressInputElements.last.nativeElement, {
            types: ["geocode"]
          });
          autocompleteStep.addListener("place_changed", (event) => {
            const place = autocompleteStep.getPlace();
            const location = place.geometry.location;
            this.selectAddress(place, id);
          });
        }, 0)
      });

    }); 
  }
}
