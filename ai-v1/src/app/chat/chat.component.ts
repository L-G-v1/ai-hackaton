// chat.component.ts
import { Component } from '@angular/core';
import { BedrockService } from './bedrock.service';
import { BedrockServiceKb } from './bedrock-kb.service';
import {BedrockServiceKbV2} from "./bedrock-kb-v2.service";

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {
  userInput = '';
  loading = false;
  history: ChatMsg[] = [];        // ⬅️ chat log

  constructor(private bedrock: BedrockService, private bedrockKb: BedrockServiceKb, private bedrockKb2: BedrockServiceKbV2) {}

  onEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();  // prevent newline
      this.send();
    }
  }

  async send() {
    const question = this.userInput.trim();
    if (!question) { return; }

    // push user message
    this.history.push({ role: 'user', text: question });
    this.userInput = '';
    this.loading = true;

    try {
      //const answer = await this.bedrock.invoke(question);
      //const answer = await this.bedrockKb.invokeWithKnowledgeBase(question);
      const answer = await this.bedrockKb2.invokeWithKnowledgeBase(question);
      // Get the text from each response and join them together
      //const responseText = answer.map(resp => resp.respSubString || '').join('`<a href="www.google.ro" target="_blank">LINK</a>`<br>');
      const responseText = answer
        .map(resp => {
          const text = resp.respSubString || '';
          const links = (resp.citationResps || [])
            .map(citation => `<a href="${citation.s3Uri}" title="${citation.textRef}" target="_blank">${citation.nr}</a>`)
            .join(' ');
          return `${text} ${links}`;
        })
        .join('<br>');
      responseText.replace(/\r\n/g, '<br>');
      this.history.push({ role: 'assistant', text: responseText });
    } catch (e) {
      this.history.push({ role: 'assistant', text: '⚠️ Error contacting Bedrock.' });
      console.error(e);
    } finally {
      this.loading = false;
    }
  }
}
