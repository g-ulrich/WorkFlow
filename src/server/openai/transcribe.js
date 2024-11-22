
import OpenAI from "openai";
import fs from "fs";
require('dotenv').config();

export default class Transcribe{
    constructor(){
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            dangerouslyAllowBrowser: true
        });
    }

    async run(path){
        const translation = await this.openai.audio.translations.create({
            file: fs.createReadStream(path),
            model: "whisper-1",
        });
    
        return translation.text;
    }
}