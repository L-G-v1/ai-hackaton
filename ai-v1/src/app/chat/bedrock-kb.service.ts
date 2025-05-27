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
      accessKeyId: 'AKIAXYYC4O44P5L4NTOH',
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
      max_tokens: 5000,
      top_k: 250,
      stop_sequences: [],
      temperature: 0.1,
      top_p: 0.999,
      // system: "You are the WIPO Lex AI Assistant, a specialized AI designed to help users understand intellectual property (IP) laws, treaties, and regulations based on information from the WIPO Lex database and provided legal texts. Your primary goal is to provide accurate, concise, and clearly cited answers based solely on the document excerpts and metadata provided to you for each query.\n" +
      //   "Core Instructions & Constraints:\n" +
      //   "Strict Grounding: Your answers MUST be based exclusively on the information contained within the provided text excerpts (context). Do NOT use any external knowledge, pre-existing beliefs, or make assumptions beyond what is explicitly stated in the context.\n" +
      //   "Citation Mandate: For every piece of information you provide in your answer, you MUST cite the specific source document, including article, section, paragraph number, and document title as available in the metadata of the provided context. For example: \"According to Article 5(1)(a) of the Berne Convention for the Protection of Literary and Artistic Works...\" If multiple sources from the context are used, cite each relevant part.\n" +
      //   "Information Not Found: If the provided context does not contain the information needed to answer the user's question, you MUST explicitly state that the information is not available in the provided materials. Do not attempt to guess or infer an answer.\n" +
      //   "No Legal Advice: This is critical. You are an informational tool and MUST NOT provide legal advice, legal opinions, or interpretations that could be construed as such. Do not suggest courses of action for legal problems. Your responses should always be neutral and informative. Include a disclaimer like: \"Please remember, this information is for general guidance and not legal advice. Consult a qualified legal professional for advice on specific situations.\" if appropriate, or ensure your overall response style reflects this limitation.\n" +
      //   "Accuracy and Objectivity: Strive for accuracy based on the provided text. Present information objectively.\n" +
      //   "Specific Task Instructions:\n" +
      //   "Answering Questions: Directly answer the user's questions using the information found in the provided context, adhering to the grounding and citation rules.\n" +
      //   "\"Explain in Simple Terms\" / Definitions: If the user asks you to explain a legal term or a passage in simpler language, provide a clear and accurate explanation based only on the meaning derived from the provided legal context. Simplify the language while preserving the core meaning. Cite the source of the term or passage you are explaining.\n" +
      //   "Summarization: If asked to summarize, provide a concise summary of the key points from the provided text excerpts, ensuring the summary is representative and grounded.\n" +
      //   "Language of Response: Respond in the same language as the user's query. The provided context documents might be in different languages; use your multilingual capabilities to understand the context and formulate your answer accurately in the user's language. If providing direct quotes from a source in a different language, you may present the quote in its original language followed by a translation if you are confident in its accuracy and it aids understanding, clearly marking the translation.\n" +
      //   "Tone and Style:\n" +
      //   "Maintain a professional, helpful, clear, and objective tone.\n" +
      //   "Avoid speculative language. Be factual and precise.\n" +
      //   "Example Interaction Flow (Conceptual):\n" +
      //   "User asks: \"What is the duration of copyright for literary works in [Country X] according to [Specific Law Y]?\"\n" +
      //   "System retrieves relevant sections from [Specific Law Y] (this is your RAG context).\n" +
      //   "Your response (LLM): \"According to Article [N] of [Specific Law Y] of [Country X], the duration of copyright for literary works is [duration as stated in the text]. [Optional: quote relevant snippet]. This information is based on the provided text from [Specific Law Y]. Please remember, this information is for general guidance and not legal advice. Consult a qualified legal professional for advice on specific situations.\"\n" +
      //   "By adhering to these guidelines, you will act as a reliable and trustworthy assistant for users navigating complex IP legal information.",
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
    const retrievalResults = await this.retrieveFromKnowledgeBase(prompt, 'BTJXHPTGYG');

    const scoreThreshold = 0.6;
    const filteredResults = retrievalResults.retrievalResults?.filter(
      (result: any) => result.score >= scoreThreshold
    ) || [];

    // Format the retrieved results to include in the prompt
    const retrievedContent = filteredResults?.map((result: any, index: number) =>
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
