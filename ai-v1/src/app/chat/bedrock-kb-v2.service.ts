import {Injectable} from '@angular/core';
import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand
} from '@aws-sdk/client-bedrock-agent-runtime';
import {Credentials} from '@aws-sdk/types';
import {RetrieveAndGenerateResponse} from "@aws-sdk/client-bedrock-agent-runtime/dist-types/models/models_0";
import {randomUUID} from 'crypto';

export interface CitationResp {
  s3Uri: string;
  textRef: string;
  nr: number;
}

export interface Response {
  citationResps: CitationResp[];
  respSubString: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ConversationContext {
  id: string;
  messages: ConversationMessage[];
}

// In-memory store to hold conversation contexts keyed by conversationId
const conversationStore = new Map<string, ConversationContext>();

@Injectable({
  providedIn: 'root'
})
export class BedrockServiceKbV2 {
  private agentClient: BedrockAgentRuntimeClient;
  private sessionId: string;

  constructor() {
    const credentials = {
      accessKeyId: 'AKIAXYYC4O44P5L4NTOH',
      secretAccessKey: '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'
    } as Credentials;

    this.agentClient = new BedrockAgentRuntimeClient({
      region: 'us-west-2',
      credentials
    });

    this.sessionId = (Math.floor(Math.random() * 100) + 1).toString();
  }

  getConversationContext(conversationId: string, maxTurns: number): ConversationContext {
    // Retrieve existing context or initialize a new one
    let context = conversationStore.get(conversationId);
    if (!context) {
      context = {id: conversationId, messages: []};
      conversationStore.set(conversationId, context);
    }

    // Trim to the last maxTurns messages
    if (context.messages.length > maxTurns * 2) {
      context.messages = context.messages.slice(-maxTurns * 2);
    }

    return context;
  }

  formatConversationHistory(context: ConversationContext): string {
    return context.messages
      .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  // Single call to query knowledge base and generate response
  async invokeWithKnowledgeBase(prompt: string): Promise<Response[]> {
    // Retrieve or create conversation context
    const conversationContext = this.getConversationContext(this.sessionId, 20);

    // Add current user message to context
    conversationContext.messages.push({
      role: 'user',
      content: prompt,
      timestamp: new Date()
    });

    // Format conversation history
    const conversationHistory = this.formatConversationHistory(conversationContext);

    // Construct the enhanced prompt with conversation history
    const enhancedPrompt = `
System: You are the WIPO Lex AI Assistant, a specialized AI designed to help users understand intellectual property (IP) laws, treaties, and regulations based on information from the WIPO Lex database and provided legal texts.
        Your primary goal is to provide accurate, concise, and clearly cited answers based solely on the document excerpts and metadata provided to you for each query.
        Core Instructions & Constraints:
          2. Citation Mandate: For every piece of information you provide in your answer, you MUST cite the specific source document, including article, section, paragraph number, and document title as available in the metadata of the provided context. For example: "According to Article 5(1)(a) of the Berne Convention for the Protection of Literary and Artistic Works..." If multiple sources from the context are used, cite each relevant part.

Previous conversation:
${conversationHistory}

Current question:
${prompt}
`;

    const command = new RetrieveAndGenerateCommand({
      input: {text: enhancedPrompt},
      retrieveAndGenerateConfiguration: {

        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {

          knowledgeBaseId: "BTJXHPTGYG", // Replace with your Knowledge Base ID
          modelArn: "us.anthropic.claude-3-7-sonnet-20250219-v1:0", // Replace with your model ARN
          orchestrationConfiguration: {
            inferenceConfig:{textInferenceConfig:{temperature:0.1, maxTokens:8192}},
            queryTransformationConfiguration:{type:'QUERY_DECOMPOSITION'},

          },
          generationConfiguration:{
            // guardrailConfiguration: {
            //   guardrailId: "z5uak9pmsf0d",
            //   guardrailVersion: "2",
            // }
            // guardrailConfiguration: {
            //   guardrailId: "bvrr4h1d2fv4",
            //   guardrailVersion: "1",
            // }
            guardrailConfiguration: {
              guardrailId: "0ztb7rpocma8",
              guardrailVersion: "1",
            }
            /*additionalModelRequestFields:{"reasoningConfig":{"type":"enabled", "budget":2000 }}*/
          }
        },
      },

    });

    try {
      console.log("*************AI REQUEST***********")
      console.log(enhancedPrompt)

      const response = await this.agentClient.send(command);
      console.log("*************AI RESPONSE***********");
      console.log(response);

      const responses: Response[] = this.processResponse(response);

      // Add assistant's response to context
      conversationContext.messages.push({
        role: 'assistant',
        content: response.output?.text ?? '',
        timestamp: new Date()
      });

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
    let nr: number = 1;

    if (response.guardrailAction === 'INTERVENED') {
      // Return empty array or handle guardrail intervention as needed
      console.warn('Guardrail intervened in the response');

      const citationResps: CitationResp[] = [];

      responses.push({
        citationResps: citationResps,
        respSubString: response.output?.text || ''
      });

      return responses;
    }

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
