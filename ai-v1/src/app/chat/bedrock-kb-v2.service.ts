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
import {RetrieveAndGenerateResponse} from "@aws-sdk/client-bedrock-agent-runtime/dist-types/models/models_0";

export interface CitationResp {
  s3Uri: string;
  textRef: string;
  nr: number;
}

export interface Response {
  citationResps: CitationResp[];
  respSubString: string;
}

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
  async invokeWithKnowledgeBase(prompt: string): Promise<Response[]> {
    const command = new RetrieveAndGenerateCommand({
      input: {text: prompt},
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: "BTJXHPTGYG", // Replace with your Knowledge Base ID
          modelArn: "us.anthropic.claude-3-7-sonnet-20250219-v1:0", // Replace with your model ARN
          orchestrationConfiguration: {
            queryTransformationConfiguration:{type:'QUERY_DECOMPOSITION'}
          }
        },
      },
    });

    try {
      const response = await this.agentClient.send(command);
      const responses: Response[] = this.processResponse(response);

      console.log("*************RESPONSE PROCESSED***********")
      console.log(responses)
      return responses;
    } catch (error) {
      console.error("Error invoking knowledge base:", error);
      throw error;
    }
  }

  processResponse(response: RetrieveAndGenerateResponse): Response[] {
    const responses: Response[] = [];
    const fullText = response.output?.text || '';
    let nr: number = 1;

    response.citations?.forEach(citation => {
      const citationResps: CitationResp[] = [];
      let forEach = citation.retrievedReferences?.forEach(reference => {
        // Find the matching reference
        const textRef = reference.content?.text;
        const s3Uri = this.convertS3UriToHttpsUrl(reference.location?.s3Location?.uri || '');

        citationResps.push({
          s3Uri: s3Uri || '',
          textRef: textRef || '',
          nr: nr++
        });
      });

      const respSubString = citation.generatedResponsePart?.textResponsePart?.text || '';

      responses.push({
        citationResps: citationResps,
        respSubString: respSubString || ''
      });
    });

    return responses;
  }

  convertS3UriToHttpsUrl(s3Uri: string, region = "us-west-2"): string {
    if (!s3Uri.startsWith("s3://")) {
      throw new Error("Invalid S3 URI format");
    }

    // Remove the 's3://' prefix
    const path = s3Uri.slice(5);

    // Split into bucket and key
    const firstSlashIndex = path.indexOf("/");
    if (firstSlashIndex === -1) {
      throw new Error("Invalid S3 URI: missing object key");
    }

    const bucket = path.substring(0, firstSlashIndex);
    const key = path.substring(firstSlashIndex + 1);

    // Replace spaces with '+' for URL encoding
    const encodedKey = key.replace(/ /g, "+");

    // Construct the HTTPS URL
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }
}
