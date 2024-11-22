import { $ } from './common/core';
import {randStr, hasText,hhmm} from "./common/tools";
import markdownit from 'markdown-it'
import { ipcRenderer } from "electron";
import FileImports from "./components/fileImports";

$(()=>{
    new Main();
    $("#menu-toggle").on('click', ()=>{
        $('#chat_history').fadeToggle();
        $("#menu-toggle").toggleClass('icon');
    });
});


class Tabs{
    constructor(){
        this.btnsContId = $("#menuBtns");
        this.menuTabsId = $("#menuTabs");
        this._setBtns();
        this.menuAddTabId = $(`#menuAddTab`);
    }

    _setBtns(){
        this.btnsContId.append(`
            <div id="menuAddTab" class="menu-tab-new px-1 rounded"><i class="fa-solid fa-plus"></i> New Chat</div>
            <div id="menuOptionsTab" class="d-none menu-tab-new px-1"><i class="fa-solid fa-angle-down"></i></div>
        `);
    }

    deleteTab(id){
        ipcRenderer.send('getDeleteChat', {tabid: id});
        ipcRenderer.once('sendDeleteChat', (event, arg) => {
            if (arg?.success) {
                console.log("Successfully deleted ", id);
            }
        });
    }

    getRandTabId(){
        var id = `${randStr(4)}_${Math.floor(Date.now() / 1000)}`;
        return id;
    }

    addNewTab(incomingId, active){
        var id = incomingId ? incomingId : this.getRandTabId();
        this.menuTabsId.append(`
        <div id="${id}" class="flex no-grow menu-tab${active ? '-active' : ''} p-1 no-highlight">
            <div id="text_${id}" title="${id}" class="menu-tab-text px-1 grow text-truncate text-left">
                <i class="fa-solid fa-message"></i> <span id="text_icon_${id}"></span> ${incomingId ? incomingId : 'New Chat'}
            </div>
            <div id="close_${id}" class="no-grow text-center menu-tab-close px-1"><i class="fa-solid fa-xmark"></i></div>
        </div>
        `);
        return id;
    }
}

class Chat {
    constructor() {
        this.nav = $('#nav');
        this.systemMsg = $(`#system_message`);
        this.chatContId = $('#chatCont');
        this.chatBodyContId = $('#chatBodyCont');
        this.chatMainId = $('#chatMain');
        this.chatInputContId = $('#chatInputCont');
        this.chatInputMainId = $('#chatInputMain');
        this.micBtnId = $(`#chat_mic`);
        this.attachBtnId = $(`#chat_attach`);
        this.fileImportsContId = $(`#fileImportsCont`);
        this.fileInputId = $(`#chat_fileInput`);
        this.modelBtnId = $(`#chat_model`);
        this.fileImports = new FileImports(this.fileImportsContId);
        this.md = markdownit({
            html: true,
            linkify: true,
            typographer: true
          });
        this.tabs = new Tabs();
        // this._setChatHeight();
        this.tokenCount = 0;
        this.chats = [];
        this.chatIds = [];
        this.msgids = [];
        this.activeChatId = "";
        this.currentChat = null;
        this.code = [];
        this.init();
    }

    async init() {
        await this._setChats();
        if (this.chats.length > 0) {
            this.chats.forEach((chat, i)=>{
                // Make the first tab active and set the id
                var id = this.tabs.addNewTab(chat.name.replace('.json', ''), i == 0 ? true : false);
                if (i == 0) {
                    this.activeChatId = id;
                    this.loadChat(id);
                }
                this.chatIds.push({id: id, active: i == 0 ? true : false}); 
            });
            this.setTabsWidth();
        }else{
            // new tab is active
            this.newChatTab();
        }
        
        this.chatIds.forEach((item)=>{
            this.setTabBinding(item.id);
        });

        this.newTabBinding();
        this.addChatIcon();
    }

    setTabsWidth(){
        var firstTab = $(`#${this.chatIds[0].id}`);
        var navWidthDiff = this.nav.width() - (this.chatIds.length * firstTab.width());
        if (navWidthDiff < (firstTab.width()*2)) {
            this.chatIds.forEach((chat)=>{
                var tab = $(`#${chat.id}`);
                tab.css('width', `${firstTab.width()-10}px`);
            });
        } else {
            this.chatIds.forEach((chat)=>{
                var tab = $(`#${chat.id}`);
                tab.css('width', `${firstTab.width()+10}px`);
            });
        }
    }

    loadBtnModelName(){
        var model = this.getModel()
        this.modelBtnId.empty();
        this.modelBtnId.append(`${ model != "AI" ? model : ''}`);
        this.updateTokeCount();
    }

    async copyToClipboard(id) {
        try {
            this.code.forEach(async (obj)=>{
                if (id == obj.id){
                    await navigator.clipboard.writeText(obj.code);
                    $(`#btn_${id}`).addClass('text-decoration-none');
                    $(`#btn_${id}`).empty();
                    var tempid = randStr(20);
                    $(`#btn_${id}`).append(`<i id="icon_${tempid}" class="fa-solid fa-check text-success"></i>`);
                    setTimeout(()=>{
                        // $(`#btn_${id}`).fadeOut();
                        $(`#icon_${tempid}`).removeClass('text-success');
                        $(`#icon_${tempid}`).css('color', '#7289da');
                        $(`#icon_${tempid}`).addClass('fa-shake');
                        setTimeout(()=>{
                            $(`#btn_${id}`).empty();
                            $(`#btn_${id}`).append(`<i class="fa-regular fa-clipboard fa-shake"></i>`);
                            setTimeout(()=>{
                                $(`#btn_${id}`).empty();
                                $(`#btn_${id}`).append(`<i class="fa-regular fa-clipboard"></i>`);
                            }, 800)
                        }, 800)
                    }, 2000);
                }
            });
        
        } catch (error) {
          console.error('Failed to copy text: ', error);
        }
      }

    getMarkdown(content){
        var dilimator = "~###~";
        var content = content.replaceAll("```", "```"+dilimator);
        var split = content.split("```");
        var newContent = "";
        var codeItems = [];
        split.forEach((item, index) => {
            var htmlCode = "";
            var code = "";
            try {
                if (item.includes(dilimator)) {
                    if (hasText(item.split("\n")[0])){
                        var lang = item.split("\n")[0].replace(dilimator, '');
                        code =  item.split(dilimator+lang+"\n")[1] ;
                        try {
                            htmlCode = hljs.highlight(
                                code, { language: lang }
                            ).value;
                        } catch (error) {
                            htmlCode = hljs.highlight(
                                code, { language: 'text' }
                            ).value;
                        }
                        var id=randStr(20);
                        var precode = `<pre style="max-height: 300px;" class="overflow-auto p-2"><code class="language-html ">`;
                        var copy_btn = `<a title="Copy ${lang.toUpperCase()} code" id="btn_${id}" 
                                            data-code="${id}" 
                                            class="copy_code_btn bg-none" style="outline:none;focus-none;border:none;cursor:pointer;bottom:4px;right:4px">
                                            <i class="fa-regular fa-clipboard"></i>
                                        </a>`;
                        newContent += `<div class="position-relative rounded bg-dark">
                        <div class="p-2 shadow text-muted">${lang.toUpperCase()}<span class="float-end">${copy_btn}</span></div>
                        ${precode}${htmlCode}</code></pre></div>`;
                        this.code.push({id: id, code: code});
                        codeItems.push(id);
                    }
                }
            } catch (error) {
                newContent += this.md.render(item.replace(dilimator+"\n", ""));
            }
            
            if (htmlCode == "") {
                newContent += this.md.render(item.replace(dilimator+"\n", ""));
            }
        });
        newContent = newContent.replaceAll(dilimator, '');
        return {content: newContent, codeIds: codeItems};
    }

    addChatIcon(){
        this.chatMainId.append(`
            <div class="chat-icon ">
               
                <i class="fa-solid fa-anchor"></i>
            </div>
            `);
    }

    emptyChat(){
        this.chatMainId.empty();
        this.addChatIcon();
        this.msgids = [];
    }

    newTabBinding(){
        const self = this;
        this.tabs.menuAddTabId.on('click', ()=> {
            self.save();
            var id = self.newChatTab();
            self.setTabBinding(id);
            // empty chat
            self.emptyChat();
            // deselect tabs
            self.chatIds.forEach((item) => {
                $(`#${item.id}`).hasClass('menu-tab-active') ? 
                $(`#${item.id}`).removeClass('menu-tab-active').addClass('menu-tab') : 
                null;
            });
            $(`#${id}`).removeClass('menu-tab').addClass('menu-tab-active');
            self.setTabsWidth();
        });
    }

    newChatTab(){
        var active = true;
        var id = this.tabs.addNewTab(null, active);
        this.activeChatId = id;
        this.chatIds.push({id: id, active: true});
        return id;
    }

    async loadChat(id){
        ipcRenderer.send('getChat', {tabid: id});
        ipcRenderer.once('sendChat', (event, arg) => {
            if (arg?.success) {
                this.currentChat = arg.info;
                this.loadBtnModelName();
                var tab = $(`#text_${id}`);
                if (this.currentChat.name != "") {
                    tab.attr('title', this.currentChat.name);
                    tab.text(this.currentChat.name);
                    tab.prepend('<i class="fa-solid fa-message"></i> ');
                }
                // load chat into page
                this.currentChat.messages.forEach((msg)=>{
                    if (msg.role != 'system') {
                        this.tokenCount += msg?.tokens ? msg?.tokens : 0
                        if (msg.role == 'user') {
                            this.newHumanMessage(msg);
                        }else{
                            this.newBotMessage(msg);
                        }
                    }
                });
                this.updateTokeCount();
                this.scrollToBottom();

            }
        });
    }

    updateTokeCount(){
        var text = this.modelBtnId.text();
        this.modelBtnId.empty();
        var model = text.split("•")[0];
        var tokens = this.tokenCount ? this.tokenCount : '';
        this.modelBtnId.append(`${model}`);
    }

    getRandMsgId(){
        var id = `${randStr(20)}`;
        this.msgids.push(id);
        return id;
    }

    save(){
        if (this.msgids.length > 1){
            ipcRenderer.send('getSaveChat', {id: this.activeChatId});
            ipcRenderer.once('sendSaveChat', (event, arg) => {
                console.log("Saved", arg);
            });
        }
    }

    getModel(msg){
        return msg?.model ? 
            msg.model : this.currentChat?.model ? 
            this.currentChat.model : 'AI';
    }

    getBotResp(msg){
        this.scrollToBottom();
        this.chatMainId.append(`
            <div class="chat-message-info temp-chat-spinner no-highlight">${this.getModel(msg)} <i class="fa-solid fa-spinner fa-spin"></i></div>
            `);
        ipcRenderer.send('getAiResp', {text: msg});
        ipcRenderer.once('sendAiResp', (event, arg) => {
            if (arg?.success) {
                $(`.temp-chat-spinner`).hide();
                this.newBotMessage(arg?.message);
                this.scrollToBottom();
                this.save();
                var tab = $(`#text_${this.activeChatId}`);
                this.tokenCount += arg?.tokenCount ? arg?.tokenCount : 0;
                this.updateTokeCount();
                this.currentChat = arg;
                if (this.currentChat?.name != "") {
                    tab.attr('title', this.currentChat.name);
                    tab.text(this.currentChat.name);
                }
            }
        });
    }

    copyBinding(id){
        $(`#btn_${id}`).on('click', (event) => {
            event.preventDefault();
           this.copyToClipboard(id);
        });
    }

    newBotMessage(msg){
        var id = this.getRandMsgId();
        this.chatMainId.append(`
            <div class="row">
                <div id="cont_${id}" class="col-12 my-3">
                    <div class="chat-message-info no-highlight">${this.getModel(msg)} • ${msg?.tokens ? msg?.tokens + ' • ' : ''} ${!msg?.time ? hhmm() : msg.time.toString().slice(11,16).includes(":") ? msg.time.toString().slice(11,16) : ''} 
                    <a title="Copy response" id="btn_${id}" 
                        data-code="${id}" 
                        class="copy_code_btn bg-none" style="outline:none;focus-none;border:none;cursor:pointer;bottom:4px;right:4px">
                        <i class="fa-regular fa-clipboard"></i>
                    </a>
                    </div>
                    <div class="flex">
                        <div id="${id}" class="no-grow chat-message-bot p-2 position-relative"></div>
                        <div class="grow"></div>
                    </div>
                </div>
            </div>
            `);
        this.code.push({id: id, code: msg?.content});
        this.copyBinding(id);
        var obj = this.getMarkdown(msg?.content);
        $(`#${id}`).append(obj.content);
        obj.codeIds.forEach((id)=>{
            this.copyBinding(id);
        });
        var width = this.chatMainId.width();
        $('.chat-message-info').css('max-width', width);
        $(`.chat-message-bot`).css('max-width', width);
    }

    newHumanMessage(msg){
        var id = this.getRandMsgId();
        var attachmentsHTML = '';
        this.fileImports.filesUsed.forEach((file)=>{
            attachmentsHTML += `<span class="px-1 border rounded" style="margin-right: .50rem;"><i class="fa-solid fa-paperclip"></i> ${file.name}</span>`;
        });
        this.chatMainId.append(`
            <div class="row">
                <div id="cont_${id}" class="col-12">
                    <div class="text-right chat-message-info no-highlight">${typeof msg == 'object' ? msg.time.toString().slice(11,16) : hhmm()}</div>
                    <div class="flex">
                        <div class="grow"></div>
                        <div class="no-grow chat-message-human p-2">
                        ${attachmentsHTML}
                        <div id="${id}"></div>
                        </div>
                    </div>
                </div>
            </div>
            `);
        $(`#${id}`).text(typeof msg == 'object' ? msg.content : msg);
     
        if (typeof msg != 'object'){
            var context = "";
            this.fileImports.filesUsed.forEach((file)=>{
                if (!file.used) {
                    context += `\n\n ${file.name} Context:\n ${file.content}`;
                    this.fileImports.setFileUsed(file);
                }
            });
            console.log(context);
            this.fileImports.updateUploadsCont();
            this.getBotResp(msg + context);
        }

        var width = this.chatMainId.width();
        $('.chat-message-info').css('max-width', width);
        $(`.chat-message-human`).css('max-width', width);
    }

    setTabBinding(id) {
        const self = this;
        $(`#close_${id}`).on('click', () => {
            self.tabs.deleteTab(id);
            $(`#${id}`).fadeOut();
            self.chatIds = self.chatIds.filter(item => item.id !== id);
            if (self.chatIds.length < 1) {
                self.newChatTab();
                // empty chat
                self.emptyChat();
            } else if (id !== self.activeChatId && self.chatIds.length > 1) {
                // nothing
            } else {
                $(`#text_${self.chatIds[0].id}`).click();
            }
            self.setTabsWidth();
        });
    
        // single click to activate
        // TODO call message history and load it.
        $(`#text_${id}`).on('click', () => {
            if (self.activeChatId !== id) {
                self.activeChatId = id;
                self.chatIds.forEach((item) => {
                    $(`#${item.id}`).hasClass('menu-tab-active') ? 
                    $(`#${item.id}`).removeClass('menu-tab-active').addClass('menu-tab') : 
                    null;
                });
                $(`#${id}`).removeClass('menu-tab').addClass('menu-tab-active');
                // clean out what is currently in chat
                this.emptyChat();
                // load chat
                self.loadChat(id);
            }
        });
    }

    scrollToBottom() {
        const chatMain = this.chatMainId;
        chatMain.animate({
            scrollTop: chatMain[0].scrollHeight
        });
    }
    

    // _setChatHeight() {
    //     this.chatContId.css('height', `calc(100vh - ${this.nav.height() + 5}px)`);
    // }

    async _setChats() {
        // Returns a Promise that resolves when the chat history is received
        return new Promise((resolve, reject) => {
            ipcRenderer.send('getHistory', {});
            ipcRenderer.once('sendHistory', (event, arg) => {
                if (arg?.success) {
                    this.chats = arg.history || []; // Assuming arg.history contains the chat history
                    resolve(this.chats);
                } else {
                    reject(new Error('Failed to retrieve chat history'));
                }
            });
        });
    }
}



class Main{
    constructor(){
        this.chat = new Chat();
        this.chat.systemMsg.hide();
        this._setWindowBindings();
        this.adjustChatSize();
        this.record = new AudioRecorder();
        
    }

    // getModels(){
    //     ipcRenderer.send('getListOfModels', {});
    //     ipcRenderer.once('sendListOfModels', (event, arg) => {
    //         console.log(arg);
    //         if (arg?.success) {
    //         }
    //     });
    // }

    adjustChatSize(){
        try {
            var spacing = this.chat.nav.height();
            var input = this.chat.chatInputContId.height() + 35;
            var newHeight = $(window).height() -spacing - input;
            $(`.chat-main-body`).css('height', `${newHeight}px`);
            // var width = $(`.chat-message-info`).width();
            // $(`.pre-code-block`).css('max-width', `${width}px`);
        } catch (error) {
            console.log(error);
        }
    }

    _setWindowBindings(){
        $('#minimizeBtn').on('click', ()=> {
            ipcRenderer.send('minimize-window');
        });
    
        $('#maximizeBtn').on('click', ()=> {
            ipcRenderer.send('maximize-window');
        });
    
        $('#closeBtn').on('click', ()=> {
            ipcRenderer.send('close-window');
        });

        this.chat.micBtnId.on('click', (e)=> {
            e.preventDefault();
            if (!this.chat.micBtnId.hasClass("text-bone")){
                this.record.startRecording();
                this.chat.micBtnId.addClass("text-bone");
                this.chat.micBtnId.addClass('bg-danger');
                this.chat.chatInputMainId.attr('placeholder', 'Recording...');
            } else {
                this.record.stopRecording(this.chat.micBtnId, this.chat.chatInputMainId);
                this.chat.micBtnId.empty();
                this.chat.micBtnId.append('<i class="fa-solid fa-spinner fa-spin"></i>');
                this.chat.micBtnId.removeClass("text-bone");
                this.chat.micBtnId.removeClass('bg-danger');
                this.chat.chatInputMainId.attr('placeholder', 'Message');
                this.chat.chatInputMainId.focus();
            }
        });

        this.chat.attachBtnId.on('click', (e)=>{
            e.preventDefault();
            this.chat.fileInputId.click();
        });

        this.chat.modelBtnId.on('click', (e)=>{
            e.preventDefault();
            if (this.chat.modelBtnId.text() == this.chat.currentChat.model){
                // cycle to next option and change to new option

            }
            console.log(this.chat.modelBtnId.text(), this.chat.currentChat.model);
        });

        this.chat.fileInputId.on('change', async function() {
            const files = $(this).prop('files');
            for (let i = 0; i < files.length; i++) {
                var file = files[i];
                var name = file.name;
                var ext = name.split(".")[ name.split(".").length -1].toLowerCase();
                if (ext == 'pdf') {
                    await self.chat.fileImports.pdf(file);
                } else if (ext == 'doc' ||  ext == 'docx') {
                    await self.chat.fileImports.doc(file);
                } else if (ext == 'xlsx' || ext == 'xls' || ext == 'xlsm' || ext == 'xlsb' || ext == 'xltx' || ext == 'xltm' || ext == 'csv') {
                    await self.chat.fileImports.excel(file);
                } else if (ext == 'html' || ext == 'htm') {
                    await self.chat.fileImports.html(file);
                } else {
                    await self.chat.fileImports.other(file);
                }
            }
        });

        var input = this.chat.chatInputMainId;
        const self = this;
        input.on('keypress', (e)=>{
            // enter
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();
                self.chat.newHumanMessage(input.val());
                input.val('');
            }
        });

        $(window).on('resize', ()=>{
            try {
                var spacing = this.chat.nav.height();
                var input = this.chat.chatInputContId.height() + 35;
                var newHeight = $(window).height() -spacing - input;
                $(`.chat-main-body`).css('height', `${newHeight}px`);
                // var width = $(`.chat-message-info`).width();
                // $(`.pre-code-block`).css('max-width', `${width}px`);
                var width = this.chatMainId.width();
                $('.chat-message-info').css('max-width', width);
                $(`.chat-message-human`).css('max-width', width);
                $(`.chat-message-bot`).css('max-width', width);
            } catch (error) {
                console.log(error);
            }
        });
    }
}

export class AudioRecorder {
    constructor() {
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.audioElement = $('#audio')[0];

    }

    async startRecording() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.start();
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };
    }

    async stopRecording($btnId, $textAreaId) {
      this.mediaRecorder.stop();
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        this.audioElement.src = audioUrl;

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            ipcRenderer.send('getSaveAudio', {audio: Buffer.from(arrayBuffer)});
            ipcRenderer.once('sendSaveAudio', (event, arg) => {
              if (arg?.success && arg?.progress == 'finished') {
                $btnId.empty();
                $btnId.append('<i class="fa-solid fa-microphone"></i>');
                $textAreaId.attr('placeholder', 'Message');
                $textAreaId.val(arg?.resp);
                this.audioChunks = [];
              }
            });
          } catch (error) {
            console.error('Error starting recording:', error);
          }
      };
    }
  }