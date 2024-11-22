import OpenAI from "openai";
require('dotenv').config();


export default class OpenaiChat{
    constructor(){
        this.openai = new OpenAI({
            apiKey:  process.env.OPENAI_API_KEY,
            dangerouslyAllowBrowser: true
        });
        this.model = "gpt-4o-mini";
        this.messages = [
            { role: 'system', content: `You are Computron, a helpful, occassionally playful and brief assistant.` },
        ];
        this.tokenCount = 0;
    }

    async getAvailableModels() {
        try {
            const response = await this.openai.models.list();
            console.log(response.data);
            var models = [];
            if (response?.data){
                response.data.forEach((model)=> {
                    if (model.id.includes('gpt-')){
                        models.push(model);
                    }
                });
            }
            return models; // List of models is in the 'data' property
        } catch (error) {
            console.error('Error fetching models:', error.message);
            return null;
        }
    }

    getError(error){
        return {
            "id": "chatcmpl-abc123",
            "object": "chat.completion",
            "created": 0,
            "model": "gpt-4o-mini",
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
                "completion_tokens_details": {
                    "reasoning_tokens": 0
                }
            },
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": error.message
                    },
                    "logprobs": null,
                    "finish_reason": "error",
                    "index": 0
                }
            ]
        };
    }

    getMessages(incomingMessage){
        this.messages.push({role: 'user', content: incomingMessage, time: new Date()});
        return this.messages;
    }

    updateMessages(resp) {
        if (resp?.choices && resp?.choices[0]?.message) {
            this.tokenCount += resp?.usage ? parseInt(resp.usage.total_tokens) : 0;
            var payload = {...resp.choices[0].message, tokens: resp.usage.total_tokens, time: new Date(), model: this.model};
            this.messages.push(payload);
            return payload;
        } else {
            return resp;
        }
    }

    async summarizeMessagesForFileName() {
        try {
            var msg = '**This is the end of the message thread.** In ONLY three words please summarize this conversation. Only reply in three words or less.';
            const resp = await this.openai.chat.completions.create({
                messages: [...this.messages, {role:'user', content: msg}],
                model: this.model
            });
            return resp?.choices[0].message?.content;
        } catch (error) {
            console.error(error);
            return this.getError(error);
        }
        
    }

    async response(incomingMessage) {
        try {
            const resp = await this.openai.chat.completions.create({
                messages: this.getMessages(incomingMessage),
                model: this.model
            });
            return this.updateMessages(resp);
        } catch (error) {
            console.error(error);
            return this.getError(error).choices[0].message;
        }
        
    }
}