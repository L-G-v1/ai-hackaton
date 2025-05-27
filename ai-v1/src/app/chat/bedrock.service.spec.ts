import { TestBed } from '@angular/core/testing';

import { BedrockService } from './bedrock.service';

describe('BedrockService', () => {
  let service: BedrockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BedrockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
