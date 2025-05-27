import { TestBed } from '@angular/core/testing';

import { BedrockKbService } from './bedrock-kb.service';

describe('BedrockKbService', () => {
  let service: BedrockKbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BedrockKbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
