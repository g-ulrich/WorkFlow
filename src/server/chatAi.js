
import OpenaiChat from './openai/openaiChat';
import OllamaChat from './ollama/ollamaChat';
import JsonFileHandler from './jsonFileHandler';


export default class ChatAi{
    constructor(){
        // this.chat = new OllamaChat();
        this.chat = new OpenaiChat();
        this.files = new JsonFileHandler();
        this.historyDir = "src/server/chatHistory";
        this.currentFriendlyName = "";
    }

    prepFileName(text){
        return text.replaceAll(" ", "_").replaceAll(".", "").replaceAll(",", "");
    }

    async sendModelInfo(ipcEvent, payload){
        var ai = this.chat;
        await ipcEvent.reply('sendAiModelInfo', { success: true, info: {tokenCount: ai.tokenCount, messages: ai.messages, model: ai.model, name: this.currentFriendlyName}});
    }

    async sendChat(ipcEvent, payload){
        var id = payload?.tabid;
        try {
            var jsonFiles = await this.files.listJsonFiles(this.historyDir); // Add await here
            let fileName = "";
            jsonFiles.forEach((file)=>{
                if (`${id}.json` == file.name){
                    fileName = file.name;
                }
            });
            if (fileName == "") {
                // new chat
                await this.resetChat(ipcEvent, payload);
                var ai = this.chat;
                await ipcEvent.reply('sendChat', { success: true, info: {tokenCount: ai.tokenCount, messages: ai.messages, model: ai.model, name: this.currentFriendlyName}});
            } else {
                // existing chat
                var respObj = await this.files.retrieveJsonArray(`${this.historyDir}/${fileName}`);
                if (this.chat.model.includes('gpt')){
                    this.chat = new OpenaiChat();
                }else{
                    this.chat = new OllamaChat();
                }
                this.chat.messages = respObj;
                this.currentFriendlyName = await this.chat.summarizeMessagesForFileName();
                var ai = this.chat;
                await ipcEvent.reply('sendChat', { success: true, info: {tokenCount: ai.tokenCount, messages: ai.messages, model: ai.model, name: this.currentFriendlyName}});
            }
        } catch (error) {
            await ipcEvent.reply('sendChat', { success: false, error: error.message});
        }
    }

    async sendHistory(ipcEvent, payload){
        try {
            var jsonFiles = await this.files.listJsonFiles(this.historyDir); // Add await here
            await ipcEvent.reply('sendHistory', { success: true, history: jsonFiles});
        } catch (error) {
            await ipcEvent.reply('sendHistory', { success: false, error: error.message });
        }
    }

    async getFriendlyName(ipcEvent, payload) {
        try {
            var resp = await this.chat.summarizeMessagesForFileName(payload?.text);
            this.currentFriendlyName = resp?.choices[0].message?.content;
            await ipcEvent.reply('sendFriendlyName', { success: true, name: this.currentFriendlyName});
        } catch (error) {
            await ipcEvent.reply('sendFriendlyName', { success: false, error:  error.message});
        }
    }

    async saveChat(ipcEvent, payload){
        var id = payload.id;
        try {
            if (this.chat.messages.length > 2){
                this.files.saveJsonArray(`${this.historyDir}/${id}.json`, this.chat.messages);
                await ipcEvent.reply('sendSaveChat', { success: true, fileName: `${id}.json`});
            } else {
                await ipcEvent.reply('sendSaveChat', { success: false, error: 'Not enough messages'});
            }
        } catch (error) {
            await ipcEvent.reply('sendSaveChat', { success: false, error: error.message});
        }
    }

    async deleteChat(ipcEvent, payload){
        try {
            await this.files.deleteJsonFile(`${this.historyDir}/${payload?.tabid}.json`);
            await this.resetChat(ipcEvent, payload);
            await ipcEvent.reply('sendDeleteChat', { success: true, fileName: `${payload?.tabid}.json`});
        } catch (error) {
            await ipcEvent.reply('sendDeleteChat', { success: false, error:  error.message});
        }
       
    }

    async resetChat(ipcEvent, payload){
        this.currentFriendlyName = "";
        if (this.chat.model.includes('gpt')){
            this.chat = new OpenaiChat();
        }else{
            this.chat = new OllamaChat();
        }
    }

    async getListOfModels(ipcEvent, payload){
        var openai = new OpenaiChat();
        var ollama = new OllamaChat();
        var ollamaModels = await ollama.getAvailableModels();
        var openaiModels = await openai.getAvailableModels();
        var allModels = [...openaiModels, ...ollamaModels];
        var models = [];
        allModels.forEach((model)=>{
            if (model?.id || model?.name) {
                models.push(model?.id ? model?.id : model?.name);
            }
        });
        
        await ipcEvent.reply('sendListOfModels', { success: true, models:  models});

    }

    async reply(ipcEvent, payload){
        var respObj = await this.chat.response(payload?.text);
        var name = await this.chat.summarizeMessagesForFileName();
        if (this.chat.model.includes('gpt')){
            var message = respObj;
            this.currentFriendlyName = name;
        }else{
            var message = respObj;
            this.currentFriendlyName = name;
        }
        await ipcEvent.reply('sendAiResp', { success: true, message: message, model:this.chat.model, tokenCount: this.chat.tokenCount, name: this.currentFriendlyName});
    }

}