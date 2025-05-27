// chat.component.ts
import { Component } from '@angular/core';
import { BedrockService } from './bedrock.service';
import { BedrockServiceKb } from './bedrock-kb.service';

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

  constructor(private bedrock: BedrockService, private bedrockKb: BedrockServiceKb) {}

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
      const answer = await this.bedrockKb.invokeWithKnowledgeBase(question);
      this.history.push({ role: 'assistant', text: answer });
    } catch (e) {
      this.history.push({ role: 'assistant', text: '⚠️ Error contacting Bedrock.' });
      console.error(e);
    } finally {
      this.loading = false;
    }
  }
}
