import $ from 'jquery';
const PDFJS = window.pdfjsLib;
const { getDocument } = PDFJS;
import { htmlToText } from 'html-to-text';
import * as XLSX from 'xlsx';
import mammoth  from 'mammoth';
import {randStr} from "../common/tools";

export default class FileImports{
    constructor($importCont){
        this.importCont = $importCont;
        this.files = [];
        this.filesUsed = [];
    }
    
    setFileUsed(file) {
        var newArr = [];
        this.filesUsed.forEach((f)=>{
            if (file.name == f.name) {
                newArr.push({...f, used: true});
            } else {
                newArr.push(f);
            }
        });
        this.filesUsed = newArr;
    }

    isFileUsed(file){
        let res = false;
        this.filesUsed.forEach((f)=>{
            if (f.name == file.name && f.used){
                res = true;
            }
        });
        return res;
    }

    isFileCached(file){
        let res = false;
        this.filesUsed.forEach((f)=>{
            if (f.name == file.name){
                res = true;
            }
        });
        return res;
    }

    updateUploadsCont(){
        var files = this.files;
        this.importCont.empty();
        this.files.forEach((file)=>{
            var id = randStr(10);
            var used = this.isFileUsed(file);
            this.importCont.prepend(`<a id="${used ? '' : id}" data-name="${file.name}" href="#" class="no-grow chat-btn ${used ? 'bg-success' : ''} px-1" style="margin-right: .50rem;"><i class="fa-solid fa-xmark"></i> ${file.name}</a>`);
            this.setFileBinding(id);
            if (!this.isFileCached(file)){
                this.filesUsed.push({name: file.name, content: file.content,id: id, used: false});
            }
        });
    }

    setFileBinding(id){
        
        var $id = $(`#${id}`);
        $id.on('click', (e)=>{
            e.preventDefault();
            // delete file
            console.log(this.files.length, this.filesUsed.length);
            $id.fadeOut();
            var name = $id.attr('data-name');
            this.files = this.files.filter(item => item.name !== name);
            this.filesUsed = this.filesUsed.filter(item => item.id !== id);
            console.log(this.files.length, this.filesUsed.length);
        });
    }

    addAttachment(id, file){
        $(`#all-attachements`).append(`
            <span id="${id}" data-file-name="${file.name}" style="margin-left: .5rem;" class="bg-dark-dark px-1 rounded">
                <a class="text-muted text-decoration-none" style="cursor:pointer">
                    <i class="fa-solid fa-xmark"></i> ${file.name} 
                </a>
            </span>
            `);
    }

    getFileContents(){
        var content = "\n";
        this.files.forEach((f)=>{
            content += `### Input Context ${f.name}\n`;
            var ext = f.name.split(".")[f.name.split(".").length -1];
            ext = ext == 'js' ? 'javaScript' : ext;
            content += "```" + `${ext}\n`;
            content += `${f.content}\n`;
            content += "```\n";
        });
        return content;
    }
    
    addFileBinding(file){
        // console.log(file.name, this.files.length, file.content.length, file.content);
        var id = randStr(20);
        this.addAttachment(id, file);
        const self = this;
        $(`#${id}`).on('click', ()=>{
            $(`#${id}`).empty();
            $(`#${id}`).hide();
            var fileName = $(`#${id}`).attr('data-file-name');
            var newFilesArr = [];
            self.files.forEach((f) =>{
                if (f.name != fileName){
                    newFilesArr.push(f);
                }
            });
            self.files = newFilesArr;
        });
    }

    async excel(file) {
        const reader = new FileReader();
        const self = this;
    
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            let textContent = jsonData.map(row => row.join('\t')).join('\n');
            const payload = { name: file.name, content: textContent };
            self.files.push(payload);  // Add to the files array
            self.addFileBinding(payload); // Handle file binding
            self.updateUploadsCont();
        };
    
        reader.readAsArrayBuffer(file); // Read the Excel file as ArrayBuffer
    }

    async doc(file){
        const reader = new FileReader();
        const self = this;
        reader.onload = function(e) {
            const typedarray = new Uint8Array(e.target.result);
            mammoth.extractRawText({buffer: typedarray})
            .then(function(result){
                var html = result.value; // The generated HTML
                var messages = result.messages; // Any messages, such as warnings during conversion
                var payload = {name: file.name, content: html};
                self.files.push(payload);
                self.addFileBinding(payload);
                self.updateUploadsCont();
            })
            .catch(function(error) {
                console.error(error);
            });
        }
        reader.readAsArrayBuffer(file);
    }

    async pdf(file){
        const reader = new FileReader();
        const self = this;
        reader.onload = function(e) {
            const typedarray = new Uint8Array(e.target.result);
            const loadingTask = getDocument(typedarray);
            loadingTask.promise.then(async (pdf) => {
                console.log('PDF loaded');
                const numPages = pdf.numPages;
                let textContent = '';

                // Extract text from each page
                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const pageTextContent = await page.getTextContent();
                    const textItems = pageTextContent.items.map(item => item.str).join(' ');
                    textContent += `Page ${pageNum}:\n${textItems}\n\n`;
                }
                var payload = {name: file.name, content: textContent};
                self.files.push(payload);
                self.addFileBinding(payload);
                self.updateUploadsCont();
            }).catch(error => {
                console.log('Error loading PDF: ' + error);
            });
        };
        reader.readAsArrayBuffer(file); // Read the PDF file as ArrayBuffer
    }

    async html(file) {
        const reader = new FileReader();
        const self = this;
        reader.onload = function(e) {
            const htmlContent = e.target.result;
            const textContent = htmlToText(htmlContent, {
                wordwrap: 130,
            });
            const payload = { name: file.name, content: textContent };
            self.files.push(payload); 
            self.addFileBinding(payload); 
            self.updateUploadsCont();
        };
        reader.readAsText(file);
    }

    async other(file){
        const reader = new FileReader();
        const self = this;
        reader.onload = function(e) {
            var payload = {name: file.name, content: e.target.result};
            self.files.push(payload);
            self.addFileBinding(payload);
            self.updateUploadsCont();
        };
        reader.readAsText(file);
    }


}