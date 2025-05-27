import { TestBed } from '@angular/core/testing';

import { BedrockKbV2Service } from './bedrock-kb-v2.service';

describe('BedrockKbV2Service', () => {
  let service: BedrockKbV2Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BedrockKbV2Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
