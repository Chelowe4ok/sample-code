// core
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CollectionViewer, DataSource } from "@angular/cdk/collections";
import { Router, ParamMap, ActivatedRoute, NavigationEnd } from '@angular/router';

// models
import { Task } from "../../models/task";
import { User } from "../../models/user";
import { Discipline } from "../../models/discipline";
import { DesignStage } from "../../models/design-stage";
import { TaskPhase } from "../../models/task-phase";
import { TaskActivity } from "../../models/task-activity";
import { TaskActivityItem } from "../../models/task-activity-item";
import { ZoomOptions } from "../../models/zoom-options";
import { Settings } from "../../models/settings";

// dialogs
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DeleteDialog } from "../dialogs/delete-dialog";

// libraries
import { MatTableDataSource } from '@angular/material';
import { DragulaService } from 'ng2-dragula';
import * as XLSX from 'xlsx';

// services
import { UserService } from './../../services/user.service';
import { TaskService } from "../../services/task.service";
import { ProjectsService } from "../../services/projects.service";
import { NavBarService } from "../../services/nav-bar.service";
import { LoadingService } from "../../services";
import { SettingsService } from "../../services/settings.service";

// rxjs
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { merge } from 'rxjs/observable/merge';
import 'rxjs/Rx';

@Component({
  selector: 'config-task',
  templateUrl: './config-task.component.html',
  styleUrls: ['./config-task.component.scss']
})
export class ConfigTaskComponent implements OnInit, OnDestroy {

  public task: Task;
  public discipline: Discipline;
  public design_stage: DesignStage;
  public phases: TaskPhase[];
  public taskActivities: TaskActivity[] = [];
  public taskActivityItems: TaskActivityItem[] = [];

  public settings: Settings;
  public loaded: boolean = false;
  public defaultZoomIconsSize: number = 17;
  public zoomLevel: number = 100;
  public phaseScrollData: { left: number, phaseId: number } = {
      left: 0,
      phaseId: null
  };

  public zoomOptions: ZoomOptions = {
      step: 20,
      minValue: 60,
      maxValue: 200,
      fontSize: 1
  };

  private exportData: any;
  private exportHeaders = ['Name', '%', 'Estimated hours', 'Actual hours', 'Start date', 'End date', 'Checked by', 'Checked date', 'QA by', 'QA date', 'Link', 'Note'];
  private exportFields = ['name', 'percentage_complete', 'hours_estimated', 'hours_actual', 'estimated_start', 'estimated_completion', 'checked_by', 'checked_on', 'qa_by', 'qa_date', 'link', 'customisation'];

  private subscribers: Subscription[] = [];
  private _userSubscriber: any;
  constructor(
    private service: TaskService,
    private projectService: ProjectsService,
    private userService: UserService,
    private navBarService: NavBarService,
    public dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private loadingService: LoadingService,
    private dragulaService: DragulaService,
    private settingsService: SettingsService,
  ) {
    dragulaService.drop.subscribe((value) => {
      this.onDrop(value.slice(1));
    });
  }

  ngOnInit() {
    this.updateData();

    let getDisciplineAndDesignStageToTheTask$ = forkJoin(this.projectService.getDescipline(this.task.discipline_id), this.projectService.getDesignStage(this.task.design_stage_id));

    let disciplineSubscriber = getDisciplineAndDesignStageToTheTask$.subscribe(result => {
      this.discipline = result[0];
      this.design_stage = result[1];
    });

    let exelSubscriber = this.navBarService.downloadTaskToExel.subscribe(() => {
      this.exportToExel();
    });

    let routerSubscriber = this.router.events.subscribe((val) => {

      if (val instanceof NavigationEnd) {
        this.updateData();
      }
    });

    this.settings = this.settingsService.settings;

    let zoomSubscriber = this.settingsService.zoomLevel.subscribe(level => {
      this.zoomLevel = level;
      this.zoomTable();
    });

    this.subscribers.push(zoomSubscriber);
    this.subscribers.push(disciplineSubscriber);
    this.subscribers.push(exelSubscriber);
    this.subscribers.push(routerSubscriber);
  }

  zoomTableUp(phaseId: number): void {
    this.zoomLevel = this.zoomLevel + this.zoomOptions.step;
    this.zoomTable();
  }

  zoomTableDown(phaseId: number): void {
    this.zoomLevel = this.zoomLevel - this.zoomOptions.step;
    this.zoomTable();
  }

  isMinZoomLevel(): boolean {
    return this.zoomLevel <= this.zoomOptions.minValue;
  }

  isMaxZoomLevel(): boolean {
    return this.zoomLevel >= this.zoomOptions.maxValue;
  }

  /**
 * Returns task activities by phase.
 *
 * @param {number} phaseId - task phase id
 */
  getTaskActivitiesToPhase(phaseId: number): TaskActivity[] {
    let result = this.taskActivities.filter(taskActivity => taskActivity.task_phase_id === phaseId);

    result.sort(function (a, b) {
      return a.sort - b.sort;
    });
    return result;   
  }

  /**
  * Returns task activity item to activity.
  *
  * @param {number} activityId - task phase id
  */
  getTaskActivityItemsToActivity(activityId: number): TaskActivityItem[] {
    let result = this.taskActivityItems.filter(taskActivityItem => taskActivityItem.task_activity_id === activityId);

    result.sort(function (a, b) {
      return a.sort - b.sort;
    });

    return result;
  }


  /**
  * Add new default activity
  *
  * @param {number} phaseId - task phase id
  */
  addActivity(phaseId: number): void {
    let defaultActivity = new TaskActivity();
    defaultActivity.name = 'New Section';
    defaultActivity.task_phase_id = phaseId;

    this.taskActivities.push(defaultActivity);
    this.service.addTaskActivity(defaultActivity).subscribe(res => {
      this.addItem(res);
    });
  }

  /**
* Add new default activity item
*
* @param {object} activity - task activity object
*/
  addItem(activity: TaskActivity): void {

    let defaultItem = new TaskActivityItem();
    let sortId: number = 0;
    let taskActivityItemsByActivity = this.taskActivityItems.filter(item => +item.task_activity_id === +activity.id);
    if (taskActivityItemsByActivity.length > 0) {
      sortId = taskActivityItemsByActivity.reduce((max, item) => { return item.sort > max ? item.sort : max, taskActivityItemsByActivity[0].sort }, taskActivityItemsByActivity[0].sort);
    }

    defaultItem.name = 'New item';
    defaultItem.task_activity_id = activity.id;
    defaultItem.hours_estimated = 0;
    defaultItem.hours_actual = 0;
    defaultItem.sort = sortId;
     
    this.service.addTaskActivityItem(defaultItem).subscribe((e) => {
      this.updateData();
    });
  }

  openDeleteTaskActivityDialog(item: TaskActivityItem): void  {
    let dialogRef = this.dialog.open(DeleteDialog, {
      width: '350px',
      data: {
        project: item,
        title: `Delete "${item.name}"`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteActivity(item);
      }
    });
  }

  /**
* Drop Section event 
*
* @param {Array} event
*   0 - [phase id, activity id]
*   1 - HTMLElement
*/
  onDrop(event): void  {
    const [element, sectionBag, el] = event;

    const draggableActivityId: number = +element.dataset.activity_id;
    const dragToPhaseId: number = +sectionBag.dataset.phase_id;

    this.taskActivities.find((activity, index) => {

      if (activity.id === draggableActivityId && activity.task_phase_id !== dragToPhaseId) {
        activity.task_phase_id = dragToPhaseId;
        this.service.updateTaskActivity({ task_phase_id: dragToPhaseId } as TaskActivity, activity.id).subscribe();
      }
      return activity.id === +element.dataset.activity_id;
    });
  }

  handleActivity(el, container, handle): boolean {
    return handle.classList.contains('handle-acivity');
  }


  deleteActivity(activity: TaskActivity): void {

    let taskActivity = this.taskActivities.find((act, index, array) => {
      if (+activity.id === +act.id) {
        array.splice(index, 1);
      }
      return +activity.id === +act.id
    });
  }

  exportToExel(): void {

    this.service.getTask(this.task.id).subscribe(res => {
      this.exportData = res;

      let response$ = forkJoin(this.service.getTaskActivities(), this.service.getTaskActivityItems());

      response$.subscribe(result => {

        this.exportData.task_phases.sort(function (a, b) {
          return a.id - b.id;
        });

        this.exportData.task_phases.forEach((taksPhase, index, taskPhases) => {

          taskPhases[index].task_activities = result[0].filter(item => {
            return item.task_phase_id == taskPhases[index].id;
          });

          taskPhases[index].task_activities.sort(function (a, b) {
            return a.sort - b.sort;
          });

          taskPhases[index].task_activities.forEach((task_activity, i, task_activities) => {
            task_activities[i].task_activity_items = result[1].filter(item => {
              return item.task_activity_id == task_activities[i].id;
            });

            task_activities[i].task_activity_items = task_activities[i].task_activity_items.sort(function (a, b) {
              return a.sort - b.sort;
            });

          });

        });
        this.exportData = this.exportData.task_phases;

        this.export();
      });
    });
  }

  /**
  * Update all data in arrays .
  *
  */
  updateData(): void {

      let data = this.route.snapshot.data.taskData;
      this.task = data;

      // get phases
      this.phases = data.task_phases.sort(function (a, b) {
          return a.sort - b.sort;
      });

      let phaseIds = this.phases.map(phase => phase.id);

      if (phaseIds.length === 0) {
          this.loaded = true;
          this.loadingService.hide();
      }

      //TODO: Current API does not allow to easily fetch data, when will be complete refactoring of the API - replace get data logic
      let allActivitiesByPhasesSubcribe = this.getAllActivitiesByPhases(phaseIds).subscribe(res => {
          this.taskActivities = [];
          this.taskActivities = this.taskActivities.concat(...res);

          if (this.taskActivities.length === 0) {
              this.loaded = true;
              this.loadingService.hide();
          }
          this.taskActivities.sort(function (a, b) {
              return a.sort - b.sort;
          });

          let activityIds = this.taskActivities.map(activity => activity.id);

          let activitySubscriber = this.getAllActivityItemsByActivities(activityIds).subscribe(res => {
              this.taskActivityItems = [];
              this.taskActivityItems = this.taskActivityItems.concat(...res);

              this.taskActivityItems.sort(function (a, b) {
                  return a.sort - b.sort;
              });

              const currentUser = this.userService.currentUser;

              let userSubscriber = this.userService.users.subscribe(users => {
                  this.taskActivityItems.forEach((item, index, array) => {
                      if (users) {
                          let qaUser = users.find(user => {
                              return (user.mail && user.mail == array[index].qa_by) || (user.userPrincipalName == array[index].qa_by);
                          });
                          array[index].qa_by_display_name = qaUser ? qaUser.displayName : array[index].qa_by;

                          let checkedUser = users.find(user => {
                              return (user.mail && user.mail == array[index].checked_by) || (user.userPrincipalName == array[index].checked_by);
                          });
                          array[index].checked_by_display_name = checkedUser ? checkedUser.displayName : array[index].checked_by;
                      } else {
                          array[index].qa_by_display_name = array[index].qa_by;
                          array[index].checked_by_display_name = array[index].checked_by
                      }

                      if (array[index].qa_by && !array[index].checked_by) {
                          array[index].can_checked_qa = false;
                          array[index].qa_by = '';
                          array[index].qa_by_display_name = '';
                          array[index].qa_date = null;
                      } else if (array[index].qa_by) {
                          array[index].can_checked_qa = true;
                      } else if (currentUser.mail && array[index].checked_by === currentUser.mail) {
                          array[index].can_checked_qa = false;
                      } else {
                          array[index].can_checked_qa = Boolean(item.checked_by);
                      }
                  });

                  // load data completed
                  this.loadingService.hide();
                  this.loaded = true;
              },
                  error => {
                      console.error("Error: graph users not defined");
                      this.router.navigate(['/login']);
                  });


              this.subscribers.push(userSubscriber);
          });

          this.subscribers.push(activitySubscriber);
      });

      this.subscribers.push(allActivitiesByPhasesSubcribe);
  }


  formatDate(date): string {
      let dateObj = new Date(date),
          locale = "en-us";

      let month = dateObj.toLocaleString(locale, { month: "long" });
      return `${dateObj.getDay()} ${month}`;
  }

  handleScroll(event: any, phaseId: number): void {

      // left scroll minus width of TAI checkbox
      this.phaseScrollData = {
          left: event.target.scrollLeft,
          phaseId: phaseId
      };
  }

  getMinWidthTable(): number {
      return this.settings.task_hours_view ? 1200 : 930;
  }

  private getAllActivitiesByPhases(phaseIds: number[]): Observable[] {
      let activitiesObservable: Observable<TaskActivity[]>[] = [];
      phaseIds.forEach(id => {
          activitiesObservable.push(this.service.getTaskActivitiesByPhase(+id));
      });

      return forkJoin(...activitiesObservable);
  }

  private getAllActivityItemsByActivities(activityIds: number[]): Observable[] {
      let activityItemsObservable: Observable<TaskActivityItem[]>[] = [];
      activityIds.forEach(id => {
          activityItemsObservable.push(this.service.getTaskActivityItemsByActivity(+id));
      });

      return forkJoin(...activityItemsObservable);
  }

  private zoomTable(): void {
      if (this.zoomLevel < this.zoomOptions.minValue) {
          this.zoomLevel = this.zoomOptions.minValue;
      } else if (this.zoomLevel > this.zoomOptions.maxValue) {
          this.zoomLevel = this.zoomOptions.maxValue;
      }
  }

  /**
  * export data to exel using xlsx - https://www.npmjs.com/package/xlsx
  */
  private export(): void {

      let getTaskActivityNameById = (task_activity_id: number): string => {
          let activity = this.taskActivities.find(activity => activity.id === task_activity_id);

          return activity.name;
      };

      let getPhaseNameById = (phaseId: number): string => {
          let phase = this.phases.find(phase => phase.id === phaseId);

          return phase.name;
      };

      /* generate workbook and add the worksheet */
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      /* worksheet */
      let ws: XLSX.WorkSheet;
      let output = [];

      this.exportData.forEach((phase, phaseIndex) => {

          output.push("");
          output.push([phase.category, ""].concat(this.exportHeaders));

          phase.task_activities.forEach((acitivity, index, array) => {
              output.push(["", acitivity.name]);

              acitivity.task_activity_items.forEach((item, index, array) => {

                  let outputFiels = [];
                  outputFiels.push("");
                  outputFiels.push("");

                  this.exportFields.forEach(field => {
                      if (item.hasOwnProperty(field)) {
                          let cell;
                          if (field === 'estimated_start' || field === 'estimated_completion' || field === 'checked_on' || field === 'qa_date') {
                              if (new Date(item[field]) > new Date(2000, 10, 10)) {
                                  cell = new Date(item[field]);
                              } else {
                                  cell = "";
                              }
                          } else {
                              cell = item[field];
                          }
                          outputFiels.push(cell);
                      };
                  })

                  output.push(outputFiels)
              });
          });
      });

      ws = XLSX.utils.aoa_to_sheet(output);
      XLSX.utils.book_append_sheet(wb, ws, this.task.name);
      /* save to file */
      XLSX.writeFile(wb, `${this.discipline ? this.discipline.category : 'Task'} ${this.design_stage ? this.design_stage.category : ''}.xlsx`);

  }

  /**
  * Implement OnDestroy interface
  */
  ngOnDestroy() {
    this.subscribers.forEach(subscriber => {
      if (subscriber) subscriber.unsubscribe();
    })
  }

}

