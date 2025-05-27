import {Injectable} from '@angular/core';
import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand
} from '@aws-sdk/client-bedrock-agent-runtime';
import {Credentials} from '@aws-sdk/types';

@Injectable({
  providedIn: 'root'
})
export class BedrockServiceKbV2 {
  private agentClient: BedrockAgentRuntimeClient;

  constructor() {
    const credentials = {
      accessKeyId: 'AKIAXYYC4O44P5L4NTOH',
      secretAccessKey: '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'
    } as Credentials;

    this.agentClient = new BedrockAgentRuntimeClient({
      region: 'us-west-2',
      credentials
    });
  }

  // Single call to query knowledge base and generate response
  async invokeWithKnowledgeBase(prompt: string): Promise<string> {
    const command = new RetrieveAndGenerateCommand({
      input: { text: prompt },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: "BTJXHPTGYG", // Replace with your Knowledge Base ID
          modelArn: "us.anthropic.claude-3-7-sonnet-20250219-v1:0", // Replace with your model ARN
        },
      },
    });

    try {
      const response = await this.agentClient.send(command);
      return response.output?.text ?? "No reply";
    } catch (error) {
      console.error("Error invoking knowledge base:", error);
      return "Error occurred";
    }
  }
}
