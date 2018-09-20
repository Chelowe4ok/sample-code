import { Directive, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';

// rxjs
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { merge } from 'rxjs/operators';

import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/operator/switchMapTo';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/map';

@Directive({
  selector: '[matrix-draggable]'
})
export class MatrixDraggableDirective implements OnInit, OnDestroy {

  private mouseDown$ = Observable.fromEvent(this.element.nativeElement, 'mousedown');
  private mouseMove$ = Observable.fromEvent(this.element.nativeElement, 'mousemove');
  private mouseUp$ = Observable.fromEvent(this.element.nativeElement, 'mouseup');
  private mouseLeave$ = Observable.fromEvent(this.element.nativeElement, 'mouseleave');

  private touchStart$ = Observable.fromEvent(this.element.nativeElement, 'touchstart');
  private touchMove$ = Observable.fromEvent(this.element.nativeElement, 'touchmove');
  private touchEnd$ = Observable.fromEvent(this.element.nativeElement, 'touchend');

  private CSS = {
    translate: (x, y) => {
      let tr = '-webkit-transform: translate(' + x + 'px, ' + y + 'px);' +
        '-moz-transform: translate(' + x + 'px, ' + y + 'px);' +
        '-ms-transform: translate(' + x + 'px, ' + y + 'px);' +
        '-o-transform: translate(' + x + 'px, ' + y + 'px);' +
        'transform: translate(' + x + 'px, ' + y + 'px);';

      return tr;
    }
  }

  private prevX: number;
  private prevY: number;
  private startX: number;
  private startY: number;
  private currentXTouchPosition: number = 0;
  private currentYTouchPosition: number = 0;
  private subscribers: Subscription[] = [];

  constructor(private element: ElementRef, private renderer: Renderer2) {
    this.renderer.setAttribute(this.element.nativeElement, "style", this.CSS.translate(0, 0)); 
  }

  ngOnInit() {
    if (this.is_touch_device()) {
      this.renderer.setAttribute(this.element.nativeElement.parentElement, "style", "overflow: scroll"); 
    } else {
      this.handleMouse();
    }
  }

  is_touch_device() {
    return 'ontouchstart' in window || navigator.maxTouchPoints;      
  };

  private handleTouch(): void {

    // inititial dragging values
    let touchStartSubscriber = this.touchStart$.subscribe((e: TouchEvent) => {
      if (!e) return;

      let transform = this.element.nativeElement.parentNode.children[0].style.transform.match(/translate\((-?\d+(?:\.\d*)?)px, (-?\d+(?:\.\d*)?)px\)/);

      let dx = transform[1];
      let dy = transform[2];

      this.startX = e.changedTouches[0].clientX + parseInt(dx);
      this.startY = e.changedTouches[0].clientY + parseInt(dy);
    });

    let touchEndSubscriber = this.touchEnd$.subscribe((e: TouchEvent) => {
      if (!e) return;

      this.currentXTouchPosition = e.changedTouches[0].clientX - this.startX + this.currentXTouchPosition;
      this.currentYTouchPosition = e.changedTouches[0].clientY - this.startY + this.currentYTouchPosition;
    });


    let touchMoveSubscriber = this.touchMove$.subscribe((e: TouchEvent) => {

      const transform = this.element.nativeElement.style.transform.match(/translate\((-?\d+(?:\.\d*)?)px, (-?\d+(?:\.\d*)?)px\)/);
      
      if (!e) return;

      const dx = -this.startX + e.changedTouches[0].clientX + this.currentXTouchPosition,
        dy = e.changedTouches[0].clientY - this.startY + this.currentYTouchPosition;

      this.moveTo(dx, dy);
    });

    this.subscribers.push(touchStartSubscriber);
    this.subscribers.push(touchEndSubscriber);
    this.subscribers.push(touchMoveSubscriber);
  }

  private handleMouse(): void {

    const moveUntilMouseUp$ = this.mouseMove$.takeUntil(this.mouseUp$.pipe(merge(this.mouseLeave$)));
    const drag$ = this.mouseDown$.switchMapTo(moveUntilMouseUp$.startWith(null));

    let mouseUpSubscriber = this.mouseUp$.subscribe((e: MouseEvent) => {
      this.element.nativeElement.classList.remove("active");
    })

    // inititial dtagging values
    let mouseDownSubscriber = this.mouseDown$.subscribe((e: MouseEvent) => {
      if (!e) return;

      this.element.nativeElement.classList.add("active");

      let transform = this.element.nativeElement.parentNode.children[0].style.transform.match(/translate\((-?\d+(?:\.\d*)?)px, (-?\d+(?:\.\d*)?)px\)/);

      let dx = transform[1];
      let dy = transform[2];

      this.startX = e.clientX + window.scrollX - parseInt(dx);
      this.startY = e.clientY + window.scrollY - parseInt(dy);

    });

    // draggin
    let dragSubscriber = drag$.subscribe((e: MouseEvent) => {
      if (!e) return;

      const dx = e.clientX + window.scrollX - this.startX,
        dy = e.clientY + window.scrollY - this.startY;

      this.moveTo(dx, dy);
    });

    this.subscribers.push(mouseUpSubscriber);
    this.subscribers.push(mouseDownSubscriber);
    this.subscribers.push(dragSubscriber);
  }

  private moveTo(dx: number, dy: number): void {

    const transform = this.element.nativeElement.style.transform.match(/translate\((-?\d+(?:\.\d*)?)px, (-?\d+(?:\.\d*)?)px\)/);

    if (transform[2] > 0 && dy > 0 || dy < 0 && this.element.nativeElement.parentElement.offsetHeight >= dy + this.element.nativeElement.offsetHeight) {
      dy = this.prevY || parseInt(transform[2]);
    } else {
      this.prevY = dy;
    }

    if (transform[1] > 0 && dx > 0 || dx < 0 && this.element.nativeElement.parentElement.offsetWidth >= dx + this.element.nativeElement.offsetWidth) {
      dx = this.prevX || parseInt(transform[1]);
    } else {
      this.prevX = dx;
    }

    if (dx + parseInt(transform[1]) > 0) dx = parseInt(transform[1]);
    if (dy + parseInt(transform[2]) > 0) dy = parseInt(transform[2]);

    dx = +dx.toFixed(2);
    dy = +dy.toFixed(2);

    this.element.nativeElement.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  ngOnDestroy() {
      this.subscribers.forEach(subscriber => {
          if (subscriber) subscriber.unsubscribe();
      });
  }
}