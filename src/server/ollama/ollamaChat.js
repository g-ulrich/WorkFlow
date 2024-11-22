import axios from 'axios';
require('dotenv').config();

export default class OllamaChat {
    constructor() {
        this.url = 'http://localhost:11434/api'; // Local API endpoint
        this.model = "llama3.2"; // Model name
        this.messages = [
            { role: 'system', content: `You are Computron, a helpful, occasionally playful and brief assistant.` },
        ];
        this.tokenCount = 0;
    }

    async getAvailableModels() {
        try {
            const response = await axios.get(`${this.url}/tags`);
            console.log(response.data.models);
            return response.data.models;
        } catch (error) {
            console.error('Error fetching models:', error.message);
            return null;
        }
    }

    getError(error) {
        return {
            model: this.model,
            created_at: '',
            message: {
              role: 'assistant',
              content: error.message
            },
            done_reason: 'error',
            done: true,
            total_duration: 0,
            load_duration: 0,
            prompt_eval_count: 0,
            prompt_eval_duration: 0,
            eval_count: 0,
            eval_duration: 0
          };
    }

    getMessages(incomingMessage) {
        this.messages.push({ role: 'user', content: incomingMessage, time: new Date() });
        return this.messages;
    }

    updateMessages(resp) {
        if (resp?.message) {
            this.tokenCount += resp?.eval_count || 0; // Adjust if usage data is in a different format
            var payload = {...resp.message, tokens: resp?.eval_count, time: new Date(), model: this.model};
            this.messages.push(payload);
            return payload;
        } else {
            return resp
        }
    }

    async summarizeMessagesForFileName() {
        try {
            const msg = '**This is the end of the message thread.** In ONLY three words please summarize this conversation. Only reply in three words or less.';
            const resp = await this.chatWithModel([...this.messages, { role: 'user', content: msg }]);
            return resp?.message?.content;
        } catch (error) {
            console.error(error);
            return this.getError(error);
        }
    }

    async response(incomingMessage) {
        try {
            const resp = await this.chatWithModel(this.getMessages(incomingMessage));
            return this.updateMessages(resp);
        } catch (error) {
            console.error(error);
            return this.getError(error);
        }
    }

    async chatWithModel(messages) {
    try {
        const payload = {
            model: this.model,
            messages: messages,
            stream: false,
        };
        
        const response = await axios.post(`${this.url}/chat`, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Ensuring to return full response data
        return response.data; // Adjust based on the complete response from the API
    } catch (error) {
        console.error(error);
        return this.getError(error);
    }
}

}
