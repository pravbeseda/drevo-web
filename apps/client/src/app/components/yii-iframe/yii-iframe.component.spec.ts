import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { YiiIframeComponent } from './yii-iframe.component';

describe('YiiIframeComponent', () => {
  let component: YiiIframeComponent;
  let fixture: ComponentFixture<YiiIframeComponent>;
  let mockRouter: jest.Mocked<Router>;
  let mockSanitizer: jest.Mocked<DomSanitizer>;

  beforeEach(async () => {
    mockRouter = {
      url: '/test-path'
    } as unknown as jest.Mocked<Router>;

    mockSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn().mockReturnValue('safe-url' as SafeResourceUrl)
    } as unknown as jest.Mocked<DomSanitizer>;

    await TestBed.configureTestingModule({
      imports: [YiiIframeComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: DomSanitizer, useValue: mockSanitizer }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(YiiIframeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize iframe source on init', () => {
    fixture.detectChanges();
    expect(mockSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('/legacy/test-path');
  });

  it('should handle iframe load event', () => {
    component.isLoading = true;
    component.onIframeLoad();
    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(false);
  });

  it('should handle iframe error event', () => {
    component.isLoading = true;
    component.onIframeError();
    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toBeTruthy();
  });

  it('should reload iframe when reload is called', () => {
    const updateSpy = jest.spyOn(component as never, 'updateIframeSrc');
    component.reload();
    expect(updateSpy).toHaveBeenCalled();
  });
});
