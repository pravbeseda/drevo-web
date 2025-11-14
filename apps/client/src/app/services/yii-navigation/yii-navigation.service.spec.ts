import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { YiiNavigationService } from './yii-navigation.service';

describe('YiiNavigationService', () => {
  let service: YiiNavigationService;
  let mockRouter: { events: Subject<unknown>; navigate: jest.Mock };

  beforeEach(() => {
    const eventsSubject = new Subject();
    mockRouter = {
      events: eventsSubject,
      navigate: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        YiiNavigationService,
        { provide: Router, useValue: mockRouter }
      ]
    });
    service = TestBed.inject(YiiNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isAngularRoute', () => {
    it('should return true for root path', () => {
      expect(service.isAngularRoute('/')).toBe(true);
    });

    it('should return true for /editor', () => {
      expect(service.isAngularRoute('/editor')).toBe(true);
    });

    it('should return false for Yii routes', () => {
      expect(service.isAngularRoute('/articles/123')).toBe(false);
      expect(service.isAngularRoute('/user/profile')).toBe(false);
    });

    it('should handle query params and hash', () => {
      expect(service.isAngularRoute('/editor?id=123')).toBe(true);
      expect(service.isAngularRoute('/editor#section')).toBe(true);
      expect(service.isAngularRoute('/articles/123?page=1#top')).toBe(false);
    });
  });

  describe('getYiiUrl', () => {
    it('should return correct Yii URL', () => {
      expect(service.getYiiUrl('/articles/123')).toBe('/legacy/articles/123');
      expect(service.getYiiUrl('articles/123')).toBe('/legacy/articles/123');
    });

    it('should handle empty path', () => {
      expect(service.getYiiUrl('')).toBe('/legacy/');
    });
  });

  describe('registerAngularRoute', () => {
    it('should register new Angular route', () => {
      service.registerAngularRoute('/new-page');
      expect(service.isAngularRoute('/new-page')).toBe(true);
    });

    it('should not register duplicate routes', () => {
      const initialCount = service.getAngularRoutes().length;
      service.registerAngularRoute('/editor');
      expect(service.getAngularRoutes().length).toBe(initialCount);
    });
  });

  describe('handleIframeNavigation', () => {
    it('should navigate to new path', () => {
      service.handleIframeNavigation('/articles/123');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/articles/123'], {
        replaceUrl: false,
        skipLocationChange: false
      });
    });
  });

  describe('sendMessageToIframe', () => {
    it('should send message to iframe if it exists', () => {
      const mockIframe = {
        contentWindow: {
          postMessage: jest.fn()
        }
      };
      
      jest.spyOn(document, 'querySelector').mockReturnValue(mockIframe as unknown as Element);
      
      const testMessage = { type: 'test', data: 'hello' };
      service.sendMessageToIframe(testMessage);
      
      expect(mockIframe.contentWindow.postMessage).toHaveBeenCalledWith(
        testMessage,
        window.location.origin
      );
    });

    it('should not throw error if iframe does not exist', () => {
      jest.spyOn(document, 'querySelector').mockReturnValue(null);
      expect(() => service.sendMessageToIframe({ type: 'test' })).not.toThrow();
    });
  });
});
