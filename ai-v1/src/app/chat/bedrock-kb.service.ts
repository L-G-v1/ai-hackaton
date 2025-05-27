import {Injectable} from '@angular/core';
import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveCommandInput
} from '@aws-sdk/client-bedrock-agent-runtime';
import {Credentials} from '@aws-sdk/types';

@Injectable({
  providedIn: 'root'
})
export class BedrockServiceKb {
  private client: BedrockRuntimeClient;
  private agentClient: BedrockAgentRuntimeClient;

  constructor() {
    const credentials = {
      accessKeyId: 'AKIAXYYC4O44K2XVQNSR',
      secretAccessKey: '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'
    } as Credentials;

    this.client = new BedrockRuntimeClient({
      region: 'us-west-2',
      credentials
    });

    this.agentClient = new BedrockAgentRuntimeClient({
      region: 'us-west-2',
      credentials
    });
  }

  async invoke(prompt: string): Promise<string> {
    const bodyObj = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 200,
      top_k: 250,
      stop_sequences: [],
      temperature: 1,
      top_p: 0.999,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    };

    console.log('*************REQ*************');
    console.log(bodyObj);

    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(bodyObj),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    );

    // Extract the assistant's reply
    const assistantReply = responseBody.content
      .map((item: { type: string; text: string }) => item.text)
      .join(' ');

    console.log('*************RESP*************');
    console.log(assistantReply);

    return assistantReply;
  }

  async retrieveFromKnowledgeBase(query: string, knowledgeBaseId: string, maxResults: number = 5): Promise<any> {
    const input: RetrieveCommandInput = {
      knowledgeBaseId,
      retrievalQuery: {
        text: query
      },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: maxResults
        }
      }
    };

    console.log('*************KB QUERY*************');
    console.log(input);

    const command = new RetrieveCommand(input);
    const response = await this.agentClient.send(command);

    console.log('*************KB RESPONSE*************');
    console.log(response);

    return response;
  }

  // Method to query knowledge base and then send results to Claude
  async invokeWithKnowledgeBase(prompt: string): Promise<string> {
    // First, retrieve relevant information from the knowledge base
    const retrievalResults = await this.retrieveFromKnowledgeBase(prompt, 'MLADKGCLCK');

    // Format the retrieved results to include in the prompt
    const retrievedContent = retrievalResults.retrievalResults?.map((result: any, index: number) =>
      `Source ${index + 1}:\n${result.content.text || JSON.stringify(result.content)}`
    ).join('\n\n') || "No relevant information found in knowledge base.";

    // Create an enhanced prompt that includes the retrieved information
    const enhancedPrompt = `
I need information about the following query:
${prompt}

Here is relevant information retrieved from the knowledge base:
${retrievedContent}

Please provide a comprehensive answer based on the retrieved information.`;

    // Now invoke Claude with the enhanced prompt
    return this.invoke(enhancedPrompt);
  }
}
