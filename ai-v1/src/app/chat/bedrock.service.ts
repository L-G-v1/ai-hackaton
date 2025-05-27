import {Injectable} from '@angular/core';
import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from '@aws-sdk/client-bedrock-runtime';
import {Credentials} from '@aws-sdk/types';

@Injectable({
  providedIn: 'root'
})
export class BedrockService {
  private client: BedrockRuntimeClient;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: 'us-west-2',
      credentials: {
        accessKeyId: 'AKIAXYYC4O44K2XVQNSR',
        secretAccessKey: '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'
      } as Credentials
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
    console.log(bodyObj)

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

    // return content.text.trim();           // ← only the assistant text
    return assistantReply;
  }
}
